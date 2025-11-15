import { getRedisClient } from '../cache/redisClient';

export interface ITokenBlacklist {
  isBlacklisted(token: string): Promise<boolean>;
  blacklist(token: string, ttlSeconds: number): Promise<void>;
}

// Implementación en memoria para desarrollo/testing
class MemoryTokenBlacklist implements ITokenBlacklist {
  private set = new Set<string>();

  async isBlacklisted(token: string): Promise<boolean> {
    return this.set.has(token);
  }

  async blacklist(token: string, _ttlSeconds: number): Promise<void> {
    this.set.add(token);
  }
}

// Implementación con Redis para producción
class RedisTokenBlacklist implements ITokenBlacklist {
  async isBlacklisted(token: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;
    try {
      const exists = await redis.exists(this.key(token));
      return exists === 1;
    } catch (err) {
      console.warn('[TokenBlacklist] isBlacklisted error:', err);
      return false; 
    }
  }

  async blacklist(token: string, ttlSeconds: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.set(this.key(token), '1', 'EX', Math.max(ttlSeconds, 1), 'NX');
    } catch (err) {
      console.warn('[TokenBlacklist] blacklist error:', err);
    }
  }

  private key(token: string): string {
    return `auth:blacklist:${token}`;
  }
}

// Factory: intenta usar Redis, fallback a memoria para dev/test
const redisClient = getRedisClient();
const useRedis = !!redisClient && (redisClient.status === 'ready');
if (!useRedis) {
  // Si Redis no está disponible o no está listo, usamos la implementación en memoria
  // Esto evita depender de Redis en entornos de test donde la conexión puede fallar
  // y hace que el comportamiento sea determinístico.
  // Nota: getRedisClient() ya emite advertencias en caso de error de conexión.
}
export const tokenBlacklist: ITokenBlacklist = useRedis
  ? new RedisTokenBlacklist()
  : new MemoryTokenBlacklist();

export default tokenBlacklist;
