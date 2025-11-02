import { Request } from 'express';
import authService from '../../../application/services';
import UserRepository from '../../../infrastructure/db/mongo/repositories/UserRepository';

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;

  const token = parts[1];
  if (authService.isBlacklisted(token)) return null;

  const payload = authService.verifyToken(token);
  if (!payload || !payload.id) return null;

  const user = await UserRepository.findById(payload.id);
  return { user, token };
}
