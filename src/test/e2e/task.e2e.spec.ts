import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Task (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;
  let ownerToken: string;
  let memberToken: string;
  let projectId: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;

    // Registrar usuario owner
    const ownerEmail = `taskowner+${Date.now()}@example.com`;
    const regRes = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: ownerEmail, password: 'abc123' } }
    );
    ownerToken = (regRes.body as any).data.register.token;

    // Registrar miembro del equipo
    const memberEmail = `taskmember+${Date.now()}@example.com`;
    const reg2 = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: memberEmail, password: 'abc123' } }
    );
    memberToken = (reg2.body as any).data.register.token;

    // Crear proyecto
    const createRes = await gql(
      `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name } }`,
      { input: { name: 'Proyecto Task E2E', description: 'Demo tareas' } },
      ownerToken
    );
    projectId = (createRes.body as any).data.createProject.id;

    // Agregar miembro al proyecto
    const addRes = await gql(
      `mutation($pid: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId:$pid, input:$input){ id } }`,
      { pid: projectId, input: { email: memberEmail, role: 'ingeniero_calidad', permissions: [] } },
      ownerToken
    );
    expect((addRes.body as any).data.addTeamMember.id).toBe(projectId);
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

  it('creates task, queries task/tasksByProject, updates and deletes with permissions', async () => {
    // Crear tarea como miembro del equipo
    const createRes = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id title status priority } }`,
      {
        input: {
          project: projectId,
          title: 'Instalar sistema eléctrico',
          description: 'Descripción detallada',
          status: 'pendiente',
          priority: 'alta',
        },
      },
      memberToken
    );
    const createBody: any = createRes.body;
    expect(createBody.data.createTask.title).toBe('Instalar sistema eléctrico');
    const taskId = createBody.data.createTask.id;

    // Consultar tarea por ID
    const taskRes = await gql(
      `query($id: ID!){ task(id:$id){ id title status priority } }`,
      { id: taskId },
      ownerToken
    );
    const taskBody: any = taskRes.body;
    if (taskBody.errors) {
      console.error('task query errors:', taskBody.errors);
    }
    expect(taskBody.errors).toBeUndefined();
    expect(taskBody.data?.task?.id).toBe(taskId);
    expect(taskBody.data?.task?.status).toBe('pendiente');

    // Consultar todas las tareas del proyecto
    const tasksRes = await gql(
      `query($projectId: ID!){ tasksByProject(projectId:$projectId){ id title status } }`,
      { projectId },
      memberToken
    );
    const tasksBody: any = tasksRes.body;
    if (tasksBody.errors) {
      console.error('tasksByProject errors:', tasksBody.errors);
    }
    expect(tasksBody.errors).toBeUndefined();
    expect(tasksBody.data?.tasksByProject?.some((t: any) => t.id === taskId)).toBe(true);

    // Creador puede actualizar su tarea
    const updateRes = await gql(
      `mutation($id: ID!, $input: UpdateTaskInput!){ updateTask(id:$id, input:$input){ id title status } }`,
      {
        id: taskId,
        input: {
          title: 'Sistema eléctrico ACTUALIZADO',
          status: 'en_progreso',
        },
      },
      memberToken
    );
    const updateBody: any = updateRes.body;
    if (updateBody.errors) {
      console.error('updateTask errors:', updateBody.errors);
    }
    expect(updateBody.errors).toBeUndefined();
    expect(updateBody.data?.updateTask?.title).toBe('Sistema eléctrico ACTUALIZADO');
    expect(updateBody.data?.updateTask?.status).toBe('en_progreso');

    // Owner puede eliminar cualquier tarea
    const deleteRes = await gql(
      `mutation($id: ID!){ deleteTask(id:$id) }`,
      { id: taskId },
      ownerToken
    );
    const deleteBody: any = deleteRes.body;
    if (deleteBody.errors) {
      console.error('deleteTask errors:', deleteBody.errors);
    }
    expect(deleteBody.errors).toBeUndefined();
    expect(deleteBody.data?.deleteTask).toBe(true);

    // Verificar que la tarea ya no existe
    const checkRes = await gql(
      `query($id: ID!){ task(id:$id){ id } }`,
      { id: taskId },
      ownerToken
    );
    const checkBody: any = checkRes.body;
    expect(checkBody.errors?.length).toBeGreaterThan(0);
  });
});
