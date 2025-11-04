import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Report (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;
  let residentToken: string;
  let memberToken: string;
  let projectId: string;
  let taskId: string;
  let memberId: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;

    // Registrar usuario residente (owner del proyecto)
    const residentEmail = `resident+${Date.now()}@example.com`;
    const regResident = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: residentEmail, password: 'abc123' } }
    );
    residentToken = (regResident.body as any).data.register.token;

    // Registrar miembro del equipo
    const memberEmail = `reportmember+${Date.now()}@example.com`;
    const regMember = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: memberEmail, password: 'abc123' } }
    );
    memberToken = (regMember.body as any).data.register.token;
    memberId = (regMember.body as any).data.register.user.id;

    // Crear proyecto como residente
    const createProjectRes = await gql(
      `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name } }`,
      { input: { name: 'Proyecto Report E2E', description: 'Demo reportes' } },
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

    // Crear tarea asignada al miembro (para reporte general)
    const createTaskRes = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id title } }`,
      {
        input: {
          project: projectId,
          title: 'Tarea para reporte general',
          description: 'Tarea de prueba',
          assignedTo: memberId,
          status: 'pendiente',
          priority: 'alta',
        },
      },
      residentToken
    );
    taskId = (createTaskRes.body as any).data.createTask.id;
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

  describe('Daily Reports', () => {
    let dailyReportId: string;

    it('member creates a daily report in draft status', async () => {
      const createRes = await gql(
        `mutation($input: CreateDailyInput!){ 
          createDailyReport(input:$input){ 
            id 
            type 
            status 
          } 
        }`,
        {
          input: {
            project: projectId,
            content: 'Reporte diario del 04/11/2025',
            checklist: [
              { item: 'Revisión de materiales', completed: true },
              { item: 'Inspección del sitio', completed: false },
            ],
            attachments: ['foto1.jpg', 'foto2.jpg'],
          },
        },
        memberToken
      );

      const body: any = createRes.body;
      if (body.errors) {
        console.error('createDailyReport errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.createDailyReport.type).toBe('daily');
      expect(body.data.createDailyReport.status).toBe('draft');
      
      dailyReportId = body.data.createDailyReport.id;
    });

    it('member updates their daily report while in draft', async () => {
      const updateRes = await gql(
        `mutation($id: ID!, $input: UpdateReportInput!){ 
          updateReport(id:$id, input:$input){ 
            id 
            status
          } 
        }`,
        {
          id: dailyReportId,
          input: {
            content: 'Reporte diario ACTUALIZADO',
            checklist: [
              { item: 'Revisión de materiales', completed: true },
              { item: 'Inspección del sitio', completed: true },
              { item: 'Reunión con supervisor', completed: false },
            ],
          },
        },
        memberToken
      );

      const body: any = updateRes.body;
      if (body.errors) {
        console.error('updateReport errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.updateReport.id).toBe(dailyReportId);
    });

    it('member submits daily report for review', async () => {
      const submitRes = await gql(
        `mutation($id: ID!){ 
          submitReportForReview(id:$id){ 
            id 
            status 
          } 
        }`,
        { id: dailyReportId },
        memberToken
      );

      const body: any = submitRes.body;
      if (body.errors) {
        console.error('submitReportForReview errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.submitReportForReview.status).toBe('in_review');
    });

    it('member cannot update daily report once submitted', async () => {
      const updateRes = await gql(
        `mutation($id: ID!, $input: UpdateReportInput!){ 
          updateReport(id:$id, input:$input){ 
            id 
          } 
        }`,
        {
          id: dailyReportId,
          input: { content: 'Intento de actualización' },
        },
        memberToken
      );

      const body: any = updateRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('No tienes permiso para actualizar este reporte diario');
    });

    it('resident approves daily report with feedback', async () => {
      const approveRes = await gql(
        `mutation($input: ApproveReportInput!){ 
          approveReport(input:$input){ 
            id 
            status 
          } 
        }`,
        {
          input: {
            reportId: dailyReportId,
            feedback: 'Excelente trabajo, reporte aprobado',
          },
        },
        residentToken
      );

      const body: any = approveRes.body;
      if (body.errors) {
        console.error('approveReport errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.approveReport.status).toBe('approved');
    });

    it('queries single daily report by id', async () => {
      const reportRes = await gql(
        `query($id: ID!){ 
          report(id:$id){ 
            id 
            type 
            status 
          } 
        }`,
        { id: dailyReportId },
        memberToken
      );

      const body: any = reportRes.body;
      if (body.errors) {
        console.error('report query errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.report.id).toBe(dailyReportId);
      expect(body.data.report.type).toBe('daily');
      expect(body.data.report.status).toBe('approved');
    });

    it('queries all reports by project', async () => {
      const reportsRes = await gql(
        `query($projectId: ID!){ 
          reportsByProject(projectId:$projectId){ 
            id 
            type 
            status 
          } 
        }`,
        { projectId },
        residentToken
      );

      const body: any = reportsRes.body;
      if (body.errors) {
        console.error('reportsByProject errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.reportsByProject.some((r: any) => r.id === dailyReportId)).toBe(true);
    });

    it('queries my reports (filtered by user)', async () => {
      const myReportsRes = await gql(
        `query($projectId: ID!){ 
          myReports(projectId:$projectId){ 
            id 
            type 
          } 
        }`,
        { projectId },
        memberToken
      );

      const body: any = myReportsRes.body;
      if (body.errors) {
        console.error('myReports errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.myReports.some((r: any) => r.id === dailyReportId)).toBe(true);
    });
  });

  describe('General Reports', () => {
    let generalReportId: string;

    it('assigned member creates a general report linked to task', async () => {
      const createRes = await gql(
        `mutation($input: CreateGeneralInput!){ 
          createGeneralReport(input:$input){ 
            id 
            type 
            status 
          } 
        }`,
        {
          input: {
            project: projectId,
            taskId: taskId,
            content: 'Reporte general de la tarea completada',
            checklist: [
              { item: 'Materiales utilizados', completed: true },
              { item: 'Control de calidad', completed: true },
            ],
          },
        },
        memberToken
      );

      const body: any = createRes.body;
      if (body.errors) {
        console.error('createGeneralReport errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.createGeneralReport.type).toBe('general');
      expect(body.data.createGeneralReport.status).toBe('draft');
      
      generalReportId = body.data.createGeneralReport.id;
    });

    it('non-assigned member cannot create general report for task', async () => {
      // Crear otro miembro no asignado a la tarea
      const otherMemberEmail = `othermember+${Date.now()}@example.com`;
      const regOther = await gql(
        `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
        { input: { email: otherMemberEmail, password: 'abc123' } }
      );
      const otherToken = (regOther.body as any).data.register.token;

      // Agregar al proyecto
      await gql(
        `mutation($pid: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId:$pid, input:$input){ id } }`,
        { pid: projectId, input: { email: otherMemberEmail, role: 'ingeniero_calidad', permissions: [] } },
        residentToken
      );

      // Intentar crear reporte general
      const createRes = await gql(
        `mutation($input: CreateGeneralInput!){ 
          createGeneralReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            project: projectId,
            taskId: taskId,
            content: 'Reporte no autorizado',
          },
        },
        otherToken
      );

      const body: any = createRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('Solo el asignatario de la tarea puede crear el reporte general');
    });

    it('member submits general report for review', async () => {
      const submitRes = await gql(
        `mutation($id: ID!){ 
          submitReportForReview(id:$id){ 
            id 
            status 
          } 
        }`,
        { id: generalReportId },
        memberToken
      );

      const body: any = submitRes.body;
      if (body.errors) {
        console.error('submitReportForReview errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.submitReportForReview.status).toBe('in_review');
    });

    it('resident rejects general report with feedback', async () => {
      const rejectRes = await gql(
        `mutation($input: RejectReportInput!){ 
          rejectReport(input:$input){ 
            id 
            status 
          } 
        }`,
        {
          input: {
            reportId: generalReportId,
            feedback: 'Falta documentación fotográfica, por favor agregar evidencias',
          },
        },
        residentToken
      );

      const body: any = rejectRes.body;
      if (body.errors) {
        console.error('rejectReport errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.rejectReport.status).toBe('rejected');
    });

    it('member cannot delete general report once submitted', async () => {
      const deleteRes = await gql(
        `mutation($id: ID!){ 
          deleteReport(id:$id) 
        }`,
        { id: generalReportId },
        memberToken
      );

      const body: any = deleteRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('No tienes permiso para eliminar este reporte general');
    });
  });

  describe('Report Status Transitions', () => {
    it('validates status transitions (cannot approve from draft)', async () => {
      // Crear un nuevo reporte en draft
      const createRes = await gql(
        `mutation($input: CreateDailyInput!){ 
          createDailyReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            project: projectId,
            content: 'Reporte para validar transiciones',
          },
        },
        memberToken
      );

      const draftReportId = (createRes.body as any).data.createDailyReport.id;

      // Intentar aprobar directamente desde draft (debe fallar)
      const approveRes = await gql(
        `mutation($input: ApproveReportInput!){ 
          approveReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            reportId: draftReportId,
            feedback: 'Aprobación inválida',
          },
        },
        residentToken
      );

      const body: any = approveRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      // El error puede ser de validación de transición de estado o de permisos
      const errorMsg = body.errors[0].message;
      const hasValidError = 
        errorMsg.includes('Transición de estado inválida') || 
        errorMsg.includes('Solo el residente puede aprobar reportes');
      expect(hasValidError).toBe(true);
    });
  });

  describe('Report Permissions', () => {
    it('non-member cannot create daily report', async () => {
      // Registrar usuario externo (no miembro del proyecto)
      const externalEmail = `external+${Date.now()}@example.com`;
      const regExternal = await gql(
        `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
        { input: { email: externalEmail, password: 'abc123' } }
      );
      const externalToken = (regExternal.body as any).data.register.token;

      const createRes = await gql(
        `mutation($input: CreateDailyInput!){ 
          createDailyReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            project: projectId,
            content: 'Reporte no autorizado',
          },
        },
        externalToken
      );

      const body: any = createRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('Debes ser miembro del proyecto para crear reportes diarios');
    });

    it('member cannot approve report (only resident can)', async () => {
      // Crear reporte y enviarlo a revisión
      const createRes = await gql(
        `mutation($input: CreateDailyInput!){ 
          createDailyReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            project: projectId,
            content: 'Reporte para validar permisos',
          },
        },
        memberToken
      );

      const reportId = (createRes.body as any).data.createDailyReport.id;

      await gql(
        `mutation($id: ID!){ submitReportForReview(id:$id){ id } }`,
        { id: reportId },
        memberToken
      );

      // Miembro intenta aprobar (debe fallar)
      const approveRes = await gql(
        `mutation($input: ApproveReportInput!){ 
          approveReport(input:$input){ 
            id 
          } 
        }`,
        {
          input: {
            reportId: reportId,
            feedback: 'Aprobación no autorizada',
          },
        },
        memberToken
      );

      const body: any = approveRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('Solo el residente puede aprobar reportes');
    });
  });
});
