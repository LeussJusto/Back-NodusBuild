import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

// Valida que JWT_SECRET esté presente en producción, usa valor por defecto en desarrollo
const JWT_SECRET = (() => {
  const val = process.env.JWT_SECRET;
  if (NODE_ENV === 'production' && !val) {
    throw new Error('JWT_SECRET es requerido en producción');
  }
  return val || 'changeme';
})();

export interface EnvConfig {
  PORT: number;
  MONGO_URI: string;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES: string;
  REDIS_URL: string;
}

// Configuración centralizada de variables de entorno con valores por defecto
export const ENV: EnvConfig = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI || '',
  NODE_ENV,
  JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '1h',
  REDIS_URL:
    process.env.REDIS_URL || (NODE_ENV === 'production' ? 'redis://redis:6379' : 'redis://localhost:6379'),
};
