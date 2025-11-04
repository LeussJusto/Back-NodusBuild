import * as jwt from 'jsonwebtoken';
import { IUserRepository, CreateUserPayload } from '../../domain/repositories/IUserRepository';
import { ENV } from '../../infrastructure/config/env';
import { tokenBlacklist } from '../../infrastructure/security/tokenBlacklist';
import { ensureValidRegistration } from '../../domain/services/AuthDomainService';

//configuración de JWT
const JWT_SECRET: string = ENV.JWT_SECRET || 'changeme';
const JWT_EXPIRES: string = ENV.JWT_EXPIRES || '1h';


export class AuthService {
  private userRepo: IUserRepository;

  constructor(userRepo: IUserRepository) {
    this.userRepo = userRepo;
  }

  async register(data: CreateUserPayload) {
    ensureValidRegistration(data.email, data.password);

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
    // Agrega token a la blacklist con TTL restante
    const ttl = this.getTokenTTLSeconds(token);
    await tokenBlacklist.blacklist(token, ttl);
    return true;
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const updated = await this.userRepo.updateAvatar(userId, avatarUrl);
    return updated;
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return tokenBlacklist.isBlacklisted(token);
  }

  // Genera un token JWT para un usuario dado
  signToken(userId: string) {
    return (jwt as any).sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  // Verifica y decodifica un token JWT
  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { id: string };
    } catch (err) {
      return null;
    }
  }

  // Obtiene el tiempo de vida restante del token en segundos
  private getTokenTTLSeconds(token: string): number {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded && typeof decoded.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;
      return ttl > 0 ? ttl : 1; // mínimo 1 segundo
    }
    return 60 * 60; // 1 hour
  }
}

export default AuthService;
