import dotenv from 'dotenv';

dotenv.config();

export interface EnvConfig {
  PORT: number;
  MONGO_URI: string;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES: string;
}

export const ENV: EnvConfig = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '1h',
};
