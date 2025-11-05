import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Notification (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;

  let residentToken: string;
  let memberToken: string;   
  let projectId: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;

    // registrar usuarios y crear proyecto
    const residentEmail = `resident+${Date.now()}@example.com`;
    const regResident = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: residentEmail, password: 'abc123' } }
    );
    const regResidentBody: any = regResident.body;
    residentToken = regResidentBody.data.register.token;

    // Registrar miembro
    const memberEmail = `notifmember+${Date.now()}@example.com`;
    const regMember = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: memberEmail, password: 'abc123' } }
    );
    const regMemberBody: any = regMember.body;
    memberToken = regMemberBody.data.register.token;

    // Crear proyecto por resident
    const createProjectRes = await gql(
      `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name } }`,
      { input: { name: 'Proyecto Notif E2E', description: 'Demo notifications' } },
      residentToken
    );
    projectId = (createProjectRes.body as any).data.createProject.id;

    // Agregar miembro al proyecto
    const addMemberRes = await gql(
      `mutation($pid: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId:$pid, input:$input){ id } }`,
      { pid: projectId, input: { email: memberEmail, role: 'ingeniero_calidad', permissions: [] } },
      residentToken
    );
    expect((addMemberRes.body as any).data.addTeamMember.id).toBe(projectId);
  });

  afterAll(async () => {
    try { if (apolloServer?.stop) await apolloServer.stop(); } catch {}
    try { if (httpServer) await new Promise<void>((r) => httpServer.close(() => r())); } catch {}
    try { await mongoose.disconnect(); } catch {}
    try { const redis = getRedisClient(); if (redis) await redis.quit(); } catch {}
  });

  function gql(query: string, variables?: any, token?: string) {
    const req = request(app).post('/graphql').send({ query, variables });
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  it('member receives PROJECT_MEMBER_ADDED and can list and count unread', async () => {
    // Listar notificaciones del miembro
    const listRes = await gql(
      `query($f: NotificationFiltersInput){ myNotifications(filters:$f){ id type title message relatedEntityType relatedEntityId read link } }`,
      { f: { type: 'project_member_added', limit: 10, offset: 0 } },
      memberToken
    );
    const listBody: any = listRes.body;
    if (listBody.errors) console.error('myNotifications errors:', listBody.errors);
    expect(listBody.errors).toBeUndefined();
    const items = listBody.data.myNotifications as any[];
    expect(items.length).toBeGreaterThanOrEqual(1);
    const memberAdded = items.find((n) => n.relatedEntityType === 'project' && n.relatedEntityId === projectId) || items[0];
    expect(memberAdded.type).toBe('project_member_added');
    expect(memberAdded.read).toBe(false);

    const countRes = await gql(`query { unreadNotificationsCount }`, undefined, memberToken);
    const countBody: any = countRes.body;
    if (countBody.errors) console.error('unreadNotificationsCount errors:', countBody.errors);
    expect(countBody.errors).toBeUndefined();
    expect(countBody.data.unreadNotificationsCount).toBeGreaterThanOrEqual(1);
  });

  it('member can mark a notification as read and then delete it', async () => {
    // Obtener notificaciones recientes para tomar un id
    const listRes = await gql(
      `query { myNotifications { id type read } }`,
      undefined,
      memberToken
    );
    const items = (listRes.body as any).data.myNotifications as any[];
    expect(items.length).toBeGreaterThan(0);
    const notifId = items[0].id as string;

    const markRes = await gql(
      `mutation($id: ID!){ markNotificationAsRead(id:$id){ id read readAt } }`,
      { id: notifId },
      memberToken
    );
    const markBody: any = markRes.body;
    if (markBody.errors) console.error('markNotificationAsRead errors:', markBody.errors);
    expect(markBody.errors).toBeUndefined();
    expect(markBody.data.markNotificationAsRead.read).toBe(true);

    // Eliminar notificación
    const delRes = await gql(
      `mutation($id: ID!){ deleteNotification(id:$id) }`,
      { id: notifId },
      memberToken
    );
    const delBody: any = delRes.body;
    if (delBody.errors) console.error('deleteNotification errors:', delBody.errors);
    expect(delBody.errors).toBeUndefined();
    expect(delBody.data.deleteNotification).toBe(true);
  });

  it('submit + approve daily report triggers REPORT_SUBMITTED and REPORT_APPROVED notifications', async () => {
    // miembro crea daily report
    const createRpt = await gql(
      `mutation($input: CreateDailyInput!){ createDailyReport(input:$input){ id status } }`,
      { input: { project: projectId, content: 'Notif flow daily report' } },
      memberToken
    );
    const reportId = (createRpt.body as any).data.createDailyReport.id as string;

    // Miembro presenta solicitud de revisión (debería notificar a residente de REPORT_SUBMITTED)
    await gql(
      `mutation($id: ID!){ submitReportForReview(id:$id){ id status } }`,
      { id: reportId },
      memberToken
    );

    // Residente verifica notificación REPORT_SUBMITTED
    const residentList = await gql(
      `query($f: NotificationFiltersInput){ myNotifications(filters:$f){ id type relatedEntityType relatedEntityId read } }`,
      { f: { type: 'report_submitted', limit: 10, offset: 0 } },
      residentToken
    );
    const rItems = (residentList.body as any).data.myNotifications as any[];
    expect(rItems.some((n) => n.type === 'report_submitted' && n.relatedEntityType === 'report' && n.relatedEntityId === reportId)).toBe(true);

    // Residente aprueba el reporte (debería notificar a miembro de REPORT_APPROVED)
    await gql(
      `mutation($input: ApproveReportInput!){ approveReport(input:$input){ id status } }`,
      { input: { reportId, feedback: 'ok' } },
      residentToken
    );

    // Meiembro verifica notificación REPORT_APPROVED
    const memberList = await gql(
      `query($f: NotificationFiltersInput){ myNotifications(filters:$f){ id type relatedEntityType relatedEntityId } }`,
      { f: { type: 'report_approved', limit: 10, offset: 0 } },
      memberToken
    );
    const mItems = (memberList.body as any).data.myNotifications as any[];
    expect(mItems.some((n) => n.type === 'report_approved' && n.relatedEntityType === 'report' && n.relatedEntityId === reportId)).toBe(true);
  });
});
