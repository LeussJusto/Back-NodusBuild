import AuthService from '../../../application/services/authService';
import { IUserRepository, CreateUserPayload } from '../../../domain/repositories/IUserRepository';


// Mock para evitar dependencias de Redis en los tests
jest.mock('../../../infrastructure/security/tokenBlacklist', () => ({
  tokenBlacklist: {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    blacklist: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Application/AuthService', () => {
  const user = { id: 'u1', email: 'u@example.com', profile: {}, isActive: true } as any;

  // Factory function para crear repositorio mock con override opcionales
  function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
      create: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(user),
      verifyCredentials: jest.fn().mockResolvedValue(user),
      updateAvatar: jest.fn().mockResolvedValue({ ...user, profile: { avatar: 'x' } }),
      ...overrides,
    } as unknown as IUserRepository;
  }

  it('registers a new user and returns token', async () => {
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(null) });
    const svc = new AuthService(repo);
    const res = await svc.register({ email: 'u@example.com', password: 'abc123' } as CreateUserPayload);
    expect(res.user.email).toBe('u@example.com');
    expect(typeof res.token).toBe('string');
  });

  it('rejects registration if email already in use', async () => {
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(user) });
    const svc = new AuthService(repo);
    await expect(
      svc.register({ email: 'u@example.com', password: 'abc123' } as CreateUserPayload)
    ).rejects.toThrow('Email already in use');
  });

  it('logs in with valid credentials and returns token', async () => {
    const repo = makeRepo({ verifyCredentials: jest.fn().mockResolvedValue(user) });
    const svc = new AuthService(repo);
    const res = await svc.login({ email: 'u@example.com', password: 'abc123' });
    expect(res.user.id).toBe('u1');
    expect(res.token).toBeTruthy();
  });

  it('fails login with invalid credentials', async () => {
    const repo = makeRepo({ verifyCredentials: jest.fn().mockResolvedValue(null) });
    const svc = new AuthService(repo);
    await expect(svc.login({ email: 'u@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials'
    );
  });

  it('verifies token and returns payload', async () => {
    const repo = makeRepo();
    const svc = new AuthService(repo);
    const token = svc.signToken('u1');
    const payload = svc.verifyToken(token);
    expect(payload).toMatchObject({ id: 'u1' });
  });

  it('returns null for invalid token', async () => {
    const repo = makeRepo();
    const svc = new AuthService(repo);
    const payload = svc.verifyToken('not-a-token');
    expect(payload).toBeNull();
  });

  it('logout returns false when no token', async () => {
    const repo = makeRepo();
    const svc = new AuthService(repo);
    await expect(svc.logout(undefined)).resolves.toBe(false);
  });

  it('logout returns true when token provided', async () => {
    const repo = makeRepo();
    const svc = new AuthService(repo);
    const token = svc.signToken('u1');
    await expect(svc.logout(token)).resolves.toBe(true);
  });
});
