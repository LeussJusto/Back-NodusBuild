import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app';
import { getRedisClient } from '../../infrastructure/cache/redisClient';

jest.setTimeout(60000);

const hasMongo = !!process.env.MONGO_URI;
const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('E2E/Chat (Mongo Atlas + Redis)', () => {
  let app: any;
  let httpServer: any;
  let apolloServer: any;
  let user1Token: string;
  let user2Token: string;
  let user2Id: string;

  beforeAll(async () => {
    const created = await createApp();
    app = created.app;
    httpServer = created.httpServer;
    apolloServer = created.apolloServer;

    // Registrar usuario 1
    const email1 = `user1+${Date.now()}@example.com`;
    const reg1 = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: email1, password: 'abc123' } }
    );
    const reg1Body: any = reg1.body;
    user1Token = reg1Body.data.register.token;

    // Registrar usuario 2
    const email2 = `user2+${Date.now()}@example.com`;
    const reg2 = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token user { id email } } }`,
      { input: { email: email2, password: 'abc123' } }
    );
    const reg2Body: any = reg2.body;
    user2Token = reg2Body.data.register.token;
    user2Id = reg2Body.data.register.user.id;
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

  it('creates a direct chat and queries lists and details', async () => {
    // Crear chat directo
    const createRes = await gql(
      `mutation($input: CreateDirectChatInput!){ createDirectChat(input:$input){ id type participants { userId { id email } role } } }`,
      { input: { peerId: user2Id } },
      user1Token
    );
    const createBody: any = createRes.body;
    const chatId = createBody?.data?.createDirectChat?.id as string;
    expect(chatId).toBeTruthy();
    expect(createBody.data.createDirectChat.type).toBe('direct');

    // myChats para user1 contiene el chat
    const my1 = await gql(
      `query { myChats { id type } }`,
      undefined,
      user1Token
    );
    const my1Body: any = my1.body;
    expect(Array.isArray(my1Body?.data?.myChats)).toBe(true);
    expect(my1Body.data.myChats.some((c: any) => c.id === chatId)).toBe(true);

    // myChats para user2 contiene el chat
    const my2 = await gql(
      `query { myChats { id type } }`,
      undefined,
      user2Token
    );
    const my2Body: any = my2.body;
    expect(my2Body.data.myChats.some((c: any) => c.id === chatId)).toBe(true);

    // Obtener chat por id con user2
    const getRes = await gql(
      `query($id: ID!){ chat(id:$id){ id type participants { userId { id } role } } }`,
      { id: chatId },
      user2Token
    );
    const getBody: any = getRes.body;
    expect(getBody?.data?.chat?.id).toBe(chatId);
    expect(getBody?.data?.chat?.type).toBe('direct');
  });
});
