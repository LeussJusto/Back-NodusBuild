import { Request } from 'express';
import authService from '../../../infrastructure/container';
import UserRepository from '../../../infrastructure/db/mongo/repositories/UserRepository';

// Middleware que extrae y valida usuario desde el header Authorization
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;

  const token = parts[1];
  
  try {
    // Verifica si el token está en la blacklist (maneja errores de Redis gracefulmente)
    const isBlacklisted = await authService.isBlacklisted(token);
    if (isBlacklisted) return null;
  } catch (err) {
    console.warn('[Middleware] Blacklist check failed:', err);
    // Continue - trata como no blacklisteado si Redis no está disponible (fail open)
  }

  // Verifica y decodifica el token
  const payload = authService.verifyToken(token);
  if (!payload || !payload.id) return null;

  // Busca el usuario en la base de datos
  const user = await UserRepository.findById(payload.id);
  return { user, token };
}
