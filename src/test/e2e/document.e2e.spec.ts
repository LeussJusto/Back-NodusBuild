import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Document (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;
  let residentToken: string;
  let memberToken: string;
  let projectId: string;
  let reportId: string;

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
    const memberEmail = `docmember+${Date.now()}@example.com`;
    const regMember = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: memberEmail, password: 'abc123' } }
    );
    memberToken = (regMember.body as any).data.register.token;

    // Crear proyecto como residente
    const createProjectRes = await gql(
      `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name } }`,
      { input: { name: 'Proyecto Document E2E', description: 'Demo documentos' } },
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

    // Crear reporte diario en draft (para asociar documentos)
    const createReportRes = await gql(
      `mutation($input: CreateDailyInput!){ 
        createDailyReport(input:$input){ 
          id 
          status 
        } 
      }`,
      {
        input: {
          project: projectId,
          content: 'Reporte para pruebas de documentos',
          checklist: [],
        },
      },
      memberToken
    );
    reportId = (createReportRes.body as any).data.createDailyReport.id;
  });

  afterAll(async () => {
    try {
      if (apolloServer?.stop) await apolloServer.stop();
    } catch {}
    try {
      if (httpServer) await new Promise<void>((r) => httpServer.close(() => r()));
    } catch {}
    try {
      await mongoose.disconnect();
    } catch {}
    try {
      const redis = getRedisClient();
      if (redis) await redis.quit();
    } catch {}
  });

  function gql(query: string, variables?: any, token?: string) {
    const req = request(app).post('/graphql').send({ query, variables });
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  describe('Query Documents', () => {
    it('queries single document by id returns null for non-existent', async () => {
      const docRes = await gql(
        `query($id: ID!) {
          document(id: $id) {
            id
            fileName
            originalName
          }
        }`,
        { id: '507f1f77bcf86cd799439011' }, 
        memberToken
      );

      const body: any = docRes.body;
      if (body.errors) {
        console.error('document query errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(body.data.document).toBeNull();
    });

    it('queries documents by entity returns empty array', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
            fileName
            originalName
          }
        }`,
        { entityType: 'report', entityId: reportId },
        memberToken
      );

      const body: any = docsRes.body;
      if (body.errors) {
        console.error('documentsByEntity errors:', body.errors);
      }
      expect(body.errors).toBeUndefined();
      expect(Array.isArray(body.data.documentsByEntity)).toBe(true);
      // El reporte recién creado no tiene documentos
      expect(body.data.documentsByEntity.length).toBe(0);
    });

    it('validates entity type (report) for documents', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
            relatedTo {
              entityType
              entityId
            }
          }
        }`,
        { entityType: 'report', entityId: reportId },
        memberToken
      );

      const body: any = docsRes.body;
      expect(body.errors).toBeUndefined();
      expect(body.data.documentsByEntity).toEqual([]);
    });

    it('validates entity type (task) for documents', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
          }
        }`,
        { entityType: 'task', entityId: '507f1f77bcf86cd799439011' },
        memberToken
      );

      const body: any = docsRes.body;
      expect(body.errors).toBeUndefined();
      expect(body.data.documentsByEntity).toEqual([]);
    });

    it('validates entity type (project) for documents', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
          }
        }`,
        { entityType: 'project', entityId: projectId },
        memberToken
      );

      const body: any = docsRes.body;
      expect(body.errors).toBeUndefined();
      expect(body.data.documentsByEntity).toEqual([]);
    });

    it('throws when querying with invalid entity type', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
          }
        }`,
        { entityType: 'invalid', entityId: reportId },
        memberToken
      );

      const body: any = docsRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('Tipo de entidad inválido');
    });

    it('throws when querying with empty entity id', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
          }
        }`,
        { entityType: 'report', entityId: '' },
        memberToken
      );

      const body: any = docsRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Documents', () => {
    it('throws when deleting non-existent document', async () => {
      const deleteRes = await gql(
        `mutation($documentId: ID!) {
          deleteDocument(documentId: $documentId)
        }`,
        { documentId: '507f1f77bcf86cd799439011' }, 
        memberToken
      );

      const body: any = deleteRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('Documento no encontrado');
    });

    it('throws when document id is empty', async () => {
      const deleteRes = await gql(
        `mutation($documentId: ID!) {
          deleteDocument(documentId: $documentId)
        }`,
        { documentId: '' },
        memberToken
      );

      const body: any = deleteRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Document Permissions', () => {
    it('requires authentication for querying document by id', async () => {
      const docRes = await gql(
        `query($id: ID!) {
          document(id: $id) {
            id
          }
        }`,
        { id: '507f1f77bcf86cd799439011' }
        // Sin token
      );

      const body: any = docRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('No autenticado');
    });

    it('requires authentication for querying documents by entity', async () => {
      const docsRes = await gql(
        `query($entityType: String!, $entityId: ID!) {
          documentsByEntity(entityType: $entityType, entityId: $entityId) {
            id
          }
        }`,
        { entityType: 'report', entityId: reportId }
        // Sin token
      );

      const body: any = docsRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('No autenticado');
    });

    it('requires authentication for deleting document', async () => {
      const deleteRes = await gql(
        `mutation($documentId: ID!) {
          deleteDocument(documentId: $documentId)
        }`,
        { documentId: '507f1f77bcf86cd799439011' }
        // Sin token
      );

      const body: any = deleteRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.errors[0].message).toContain('No autenticado');
    });

    it('validates document id format for query', async () => {
      const docRes = await gql(
        `query($id: ID!) {
          document(id: $id) {
            id
          }
        }`,
        { id: '' },
        memberToken
      );

      const body: any = docRes.body;
      expect(body.errors?.length).toBeGreaterThan(0);
    });
  });
});
