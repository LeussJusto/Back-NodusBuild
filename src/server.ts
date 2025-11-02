import dotenv from 'dotenv';
import { createApp } from './app';

// Cargar variables de entorno
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    const { httpServer } = await createApp();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

