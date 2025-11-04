import { getUserFromRequest } from '../../../interface/graphql/middleware/authMiddleware';

// Mock del container para simular verificación de tokens
jest.mock('../../../infrastructure/container', () => ({
  __esModule: true,
  default: {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    verifyToken: jest.fn().mockReturnValue({ id: '1' }),
  },
}));

// Mock del UserRepository para simular búsqueda en base de datos
jest.mock('../../../infrastructure/db/mongo/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue({ id: '1', email: 'u@example.com' }),
  },
}));

describe('Integration/authMiddleware.getUserFromRequest', () => {
  it('returns null when no Authorization header', async () => {
    const req: any = { headers: {} };
    const res = await getUserFromRequest(req);
    expect(res).toBeNull();
  });

  it('returns null when malformed Authorization header', async () => {
    const req: any = { headers: { authorization: 'BadHeader' } };
    const res = await getUserFromRequest(req);
    expect(res).toBeNull();
  });

  it('returns user and token when valid', async () => {
    const req: any = { headers: { authorization: 'Bearer token123' } };
    const res = await getUserFromRequest(req);
    expect(res).not.toBeNull();
    expect(res?.user?.email).toBe('u@example.com');
    expect(res?.token).toBe('token123');
  });
});
