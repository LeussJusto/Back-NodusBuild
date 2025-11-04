import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Project (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;
  let ownerToken: string;
  let ownerEmail: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;

    //Registrar usuario owner
    ownerEmail = `owner+${Date.now()}@example.com`;
    const regRes = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: ownerEmail, password: 'abc123' } }
    );
    ownerToken = (regRes.body as any).data.register.token;
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

  it('creates project, lists myProjects, add/remove member, update/delete only by owner', async () => {
    // Crear proyecto
    const createRes = await gql(
      `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name status } }`,
      { input: { name: 'Obra E2E', description: 'Demo', timeline: { startDate: '2024-01-01' } } },
      ownerToken
    );
    const createBody: any = createRes.body;
    const projectId = createBody.data.createProject.id as string;
    expect(projectId).toBeTruthy();

    // Mi lista de proyectos incluye el creado
    const myRes = await gql(`query { myProjects { id name } }`, undefined, ownerToken);
    const myBody: any = myRes.body;
    expect(myBody.data.myProjects.some((p: any) => p.id === projectId)).toBe(true);

    // Registrar un segundo usuario (miembro del equipo)
    const memberEmail = `member+${Date.now()}@example.com`;
    const reg2 = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: memberEmail, password: 'abc123' } }
    );
    const memberToken = (reg2.body as any).data.register.token as string;

    // Agregar miembro al equipo por el owner
    const addRes = await gql(
      `mutation($pid: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId:$pid, input:$input){ id name } }`,
      { pid: projectId, input: { email: memberEmail, role: 'ingeniero_calidad', permissions: [] } },
      ownerToken
    );
    const addBody: any = addRes.body;
    expect(addBody.data.addTeamMember.id).toBe(projectId);

    // Miembro del equipo no puede actualizar el proyecto
    const updAsMember = await gql(
      `mutation($id: ID!, $input: UpdateProjectInput!){ updateProject(id:$id, input:$input){ id name } }`,
      { id: projectId, input: { name: 'Nope' } },
      memberToken
    );
    const updMemberBody: any = updAsMember.body as any;
    expect(updMemberBody.errors?.length).toBeGreaterThan(0);

    // Owner puede actualizar el proyecto
    const updAsOwner = await gql(
      `mutation($id: ID!, $input: UpdateProjectInput!){ updateProject(id:$id, input:$input){ id name } }`,
      { id: projectId, input: { name: 'Obra Actualizada' } },
      ownerToken
    );
    const updOwnerBody: any = updAsOwner.body;
    expect(updOwnerBody.data.updateProject.name).toBe('Obra Actualizada');

    // Remover miembro del equipo por el owner
    const userInfoRes = await gql(`query { me { id email } }`, undefined, memberToken);
    const memberId = (userInfoRes.body as any).data.me.id as string;
    const remRes = await gql(
      `mutation($pid: ID!, $uid: ID!){ removeTeamMember(projectId:$pid, userId:$uid){ id name } }`,
      { pid: projectId, uid: memberId },
      ownerToken
    );
    const remBody: any = remRes.body;
    expect(remBody.data.removeTeamMember.id).toBe(projectId);

    // Miembro ya no puede eliminar el proyecto
    const delAsMember = await gql(
      `mutation($id: ID!){ deleteProject(id:$id) }`,
      { id: projectId },
      memberToken
    );
    const delMemberBody: any = delAsMember.body as any;
    expect(delMemberBody.errors?.length).toBeGreaterThan(0);

    // Owner puede eliminar el proyecto
    const delAsOwner = await gql(
      `mutation($id: ID!){ deleteProject(id:$id) }`,
      { id: projectId },
      ownerToken
    );
    const delOwnerBody: any = delAsOwner.body;
    expect(delOwnerBody.data.deleteProject).toBe(true);
  });
});
