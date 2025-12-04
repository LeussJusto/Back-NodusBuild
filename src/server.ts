import dotenv from 'dotenv';
import { createApp } from './app';

// Cargar variables de entorno
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    const { httpServer } = await createApp();

    // Inicializar WebSocket server (Socket.IO) con Redis adapter
    try {
      const { initSocketServer } = await import('./infrastructure/ws/socketServer');
      initSocketServer(httpServer);
      console.log('[Server] Socket.IO server initialized');
    } catch (err) {
      console.warn('[Server] Failed to initialize Socket.IO server:', err);
    }

    // Bind to 0.0.0.0 so the server is reachable from host, containers and emulators
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
      console.log(`🚀 Also reachable from Android emulator (0.0.0.0): http://0.0.0.0:${PORT}/graphql`);
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

