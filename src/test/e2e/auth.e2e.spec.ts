import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(45000);

//Solo ejecutar E2E si tenemos un URI real de Mongo (Atlas)
const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Auth (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;
  });

  afterAll(async () => {
    // Cleanup: apagar servicios en orden correcto
    // 1. Apollo Server primero para cerrar GraphQL
    if (apolloServer?.stop) {
      await apolloServer.stop();
    }
    // 2. HTTP server
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    // 3. Desconectar MongoDB
    try { await mongoose.disconnect(); } catch {}
    // 4. Cerrar Redis
    try {
      const redis = getRedisClient();
      if (redis) await redis.quit();
    } catch {}
  });

// Helper para hacer requests GraphQL con autenticación opcional
  function gql(query: string, variables?: any, token?: string) {
    const req = request(app).post('/graphql').send({ query, variables });
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  it('register, login, me, uploadAvatar, logout, me (revoked)', async () => {
    const email = `user+${Date.now()}@example.com`;

    // register
    const registerRes = await gql(
      `mutation($input: RegisterInput!) { register(input: $input) { token user { id email } } }`,
      { input: { email, password: 'abc123', profile: { firstName: 'E2E' } } }
    );
    const regBody: any = registerRes.body;
    expect(regBody?.data?.register?.user?.email).toBe(email);
    const regToken = regBody.data.register.token as string;
    expect(typeof regToken).toBe('string');

    // login
    const loginRes = await gql(
      `mutation($email: String!, $password: String!){ login(email:$email, password:$password){ token user { id email } } }`,
      { email, password: 'abc123' }
    );
    const loginBody: any = loginRes.body;
    expect(loginBody?.data?.login?.user?.email).toBe(email);
    const token = loginBody.data.login.token as string;
    expect(token).toBeTruthy();

    // me (authorized)
    const meRes = await gql(`query { me { id email } }`, undefined, token);
    const meBody: any = meRes.body;
    expect(meBody?.data?.me?.email).toBe(email);

    // uploadAvatar
    const upRes = await gql(
      `mutation($u: String!){ uploadAvatar(avatarUrl: $u) { id email profile { avatar } } }`,
      { u: 'https://cdn.example.com/a.png' },
      token
    );
    const upBody: any = upRes.body;
    expect(upBody?.data?.uploadAvatar?.profile?.avatar).toBe('https://cdn.example.com/a.png');

    // logout
    const loRes = await gql(`mutation { logout }`, undefined, token);
    const loBody: any = loRes.body;
    expect(loBody?.data?.logout).toBe(true);

    // ME CON TOKEN REVOKED - Verificar que el token ya no funciona
    const me2Res = await gql(`query { me { id email } }`, undefined, token);
    const me2Body: any = me2Res.body;
    expect(me2Body?.data?.me).toBeNull();
  });
});
