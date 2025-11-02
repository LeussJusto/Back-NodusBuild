import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async (): Promise<void> => {
  if (!ENV.MONGO_URI) {
    throw new Error('❌ Falta la variable MONGO_URI en el .env');
  }

  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅ Conexión a MongoDB exitosa');
};

export default connectDB;
