import express from 'express';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import connectDB from './infrastructure/config/database';
import userSchemaDef from './interface/graphql/schema/userSchema';
import projectSchemaDef from './interface/graphql/schema/projectSchema';
import taskSchemaDef from './interface/graphql/schema/taskSchema';
import reportSchemaDef from './interface/graphql/schema/reportSchema';
import documentSchemaDef from './interface/graphql/schema/documentSchema';
import notificationSchemaDef from './interface/graphql/schema/notificationSchema';
import { getUserFromRequest } from './interface/graphql/middleware/authMiddleware';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authService, projectService, taskService, reportService, documentService, notificationService } from './infrastructure/container';

export async function createApp() {
  const app = express();
  
  // Crear httpServer para Apollo Server
  const httpServer = http.createServer(app);

  // Conectar a la base de datos
  try {
    await connectDB();
  } catch (err) {
    console.warn('MongoDB connection warning:', err);
  }

  // Apollo Server (combinar schemas de user, project, task, report, document y notification)
  const apolloServer = new ApolloServer({
    typeDefs: [
      userSchemaDef.typeDefs,
      projectSchemaDef.typeDefs,
      taskSchemaDef.typeDefs,
      reportSchemaDef.typeDefs,
      documentSchemaDef.typeDefs,
      notificationSchemaDef.typeDefs,
    ],
    resolvers: [
      userSchemaDef.resolvers,
      projectSchemaDef.resolvers,
      taskSchemaDef.resolvers,
      reportSchemaDef.resolvers,
      documentSchemaDef.resolvers,
      notificationSchemaDef.resolvers,
    ],
  });

  await apolloServer.start();

  // Middleware básico
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Servir archivos subidos (solo desarrollo/local). En producción, usar CDN o servidor de estáticos.
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Extraer usuario 
        const auth = await getUserFromRequest(req as any);
        return {
          req,
          user: auth ? auth.user : null,
          token: auth ? auth.token : null,
          authService,
          projectService,
          taskService,
          reportService,
          documentService,
          notificationService,
        };
      },
    })
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return { app, httpServer, apolloServer };
}

export default express();

