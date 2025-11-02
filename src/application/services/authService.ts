import * as jwt from 'jsonwebtoken';
import { IUserRepository, CreateUserPayload } from '../../domain/repositories/IUserRepository';
import { ENV } from '../../infrastructure/config/env';

const JWT_SECRET: string = ENV.JWT_SECRET || 'changeme';
const JWT_EXPIRES: string = ENV.JWT_EXPIRES || '1h';

// Simple in-memory blacklist. For production use a persistent store.
const tokenBlacklist = new Set<string>();

export class AuthService {
  private userRepo: IUserRepository;

  constructor(userRepo: IUserRepository) {
    this.userRepo = userRepo;
  }

  async register(data: CreateUserPayload) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new Error('Email already in use');

    const user = await this.userRepo.create(data);
    const token = this.signToken(user.id);
    return { user, token };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userRepo.verifyCredentials(data.email, data.password);
    if (!user) throw new Error('Invalid credentials');
    const token = this.signToken(user.id);
    return { user, token };
  }

  async logout(token?: string) {
    if (!token) return false;
    tokenBlacklist.add(token);
    return true;
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const updated = await this.userRepo.updateAvatar(userId, avatarUrl);
    return updated;
  }

  isBlacklisted(token: string) {
    return tokenBlacklist.has(token);
  }

  signToken(userId: string) {
    return (jwt as any).sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { id: string };
    } catch (err) {
      return null;
    }
  }
}

export default AuthService;
