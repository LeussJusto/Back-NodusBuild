import Redis from 'ioredis';
import { ENV } from '../config/env';

let client: Redis | null = null;

// Singleton para el cliente Redis - reutiliza la conexión existente
export function getRedisClient(): Redis | null {
  if (client) return client;
  try {
    client = new Redis(ENV.REDIS_URL, { 
      lazyConnect: false, // Conexión inmediata al crear el cliente
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) return null; // dejar de reintentar
        return Math.min(times * 50, 2000);
      },
    });
    
    // Manejo de errores - no rompe la aplicación si Redis falla
    client.on('error', (err) => {
      console.warn('[Redis] Error:', err.message);
    });
    
    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });
    
    return client;
  } catch (err) {
    console.warn('[Redis] Initialization error:', err);
    return null; // Fallo silencioso - la app sigue funcionando sin Redis
  }
}

export default getRedisClient;
