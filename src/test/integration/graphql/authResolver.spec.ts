import { ApolloServer } from '@apollo/server';
import userSchemaDefinition from '../../../interface/graphql/schema/userSchema';

describe('Integration/GraphQL auth resolvers', () => {
  // Mock del servicio de autenticación para aislar las pruebas
  const mockService = {
    register: jest.fn().mockResolvedValue({
      token: 't-register',
      user: { id: '1', email: 'reg@example.com' },
    }),
    login: jest.fn().mockResolvedValue({
      token: 't-login',
      user: { id: '1', email: 'login@example.com' },
    }),
    logout: jest.fn().mockResolvedValue(true),
    uploadAvatar: jest.fn().mockResolvedValue({ id: '1', email: 'u@example.com', profile: { avatar: 'a.png' } }),
  };

  // Servidor Apollo real con schema y resolvers reales
  const server = new ApolloServer({
    typeDefs: userSchemaDefinition.typeDefs,
    resolvers: userSchemaDefinition.resolvers,
  });

  it('register returns token and user', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($input: RegisterInput!) { register(input: $input) { token user { id email } } }`,
        variables: { input: { email: 'reg@example.com', password: 'abc123' } },
      },
      { contextValue: { authService: mockService } }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.register.token).toBe('t-register');
    expect(data.register.user.email).toBe('reg@example.com');
  });

  it('login returns token and user', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($email: String!, $password: String!){ login(email:$email, password:$password){ token user { id email } } }`,
        variables: { email: 'login@example.com', password: 'abc123' },
      },
      { contextValue: { authService: mockService } }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.login.token).toBe('t-login');
    expect(data.login.user.email).toBe('login@example.com');
  });

  it('me returns user from context', async () => {
    const user = { id: '1', email: 'me@example.com' };
    const res = await server.executeOperation(
      { query: `query { me { id email } }` },
      { contextValue: { user } }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.me.email).toBe('me@example.com');
  });

  it('logout returns true', async () => {
    const res = await server.executeOperation(
      { query: `mutation { logout }` },
      { contextValue: { authService: mockService, token: 't' } }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.logout).toBe(true);
  });

  it('uploadAvatar returns updated user', async () => {
    const res = await server.executeOperation(
      { query: `mutation { uploadAvatar(avatarUrl: "a.png") { id email profile { avatar } } }` },
      { contextValue: { authService: mockService, user: { id: '1' } } }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.uploadAvatar.profile.avatar).toBe('a.png');
  });
});
