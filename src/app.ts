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
import chatSchemaDef from './interface/graphql/schema/chatSchema';
import messageSchemaDef from './interface/graphql/schema/messageSchema';
import eventSchemaDef from './interface/graphql/schema/eventSchema';
import incidentSchemaDef from './interface/graphql/schema/incidentSchema';
import { getUserFromRequest } from './interface/graphql/middleware/authMiddleware';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authService, projectService, taskService, eventService, reportService, documentService, notificationService, chatService, incidentService } from './infrastructure/container';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';

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

  // Apollo Server (combinar schemas de user, project, task, report, document, notification y chat)
  const apolloServer = new ApolloServer({
    typeDefs: [
      userSchemaDef.typeDefs,
      projectSchemaDef.typeDefs,
      taskSchemaDef.typeDefs,
      eventSchemaDef.typeDefs,
        incidentSchemaDef.typeDefs,
      reportSchemaDef.typeDefs,
      documentSchemaDef.typeDefs,
      notificationSchemaDef.typeDefs,
      messageSchemaDef.typeDefs,
      chatSchemaDef.typeDefs,
    ],
    resolvers: [
      userSchemaDef.resolvers,
      projectSchemaDef.resolvers,
      taskSchemaDef.resolvers,
      eventSchemaDef.resolvers,
        incidentSchemaDef.resolvers,
      reportSchemaDef.resolvers,
      documentSchemaDef.resolvers,
      notificationSchemaDef.resolvers,
      // message resolvers (file must be created under resolvers)
      require('./interface/graphql/resolvers/messageResolver').default,
      chatSchemaDef.resolvers,
    ],
  });

  await apolloServer.start();

  // Run an initial sweep to mark past events as realizado and schedule periodic checks
  try {
    // call once at startup
    await eventService.markDueEventsAsRealized();
  } catch (err) {
    console.warn('[App] initial markDueEventsAsRealized failed:', err);
  }

  // Schedule periodic sweep every hour
  setInterval(() => {
    eventService
      .markDueEventsAsRealized()
      .then((count) => {
        if (count && count > 0) console.log(`[App] marked ${count} events as realizado`);
      })
      .catch((err) => console.warn('[App] scheduled markDueEventsAsRealized failed:', err));
  }, 60 * 60 * 1000); // 1 hour

  // Middleware básico
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Servir archivos subidos (solo desarrollo/local). En producción, usar CDN o servidor de estáticos.
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Habilitar multipart uploads para GraphQL (graphql-upload)
  // Intentar carga dinámica para soportar versiones que exportan solo ESM (.mjs)
  try {

    const dynamicImport: (p: string) => Promise<any> = new Function('p', 'return import(p);') as any;
    const mod = await dynamicImport('graphql-upload/graphqlUploadExpress.mjs');
    const graphqlUploadExpress = mod.graphqlUploadExpress || mod.default || mod;
    if (typeof graphqlUploadExpress === 'function') {
      app.use(graphqlUploadExpress({ maxFileSize: 100_000_000, maxFiles: 10 }));
      console.log('[App] graphql-upload middleware enabled');
    } else {
      console.warn('[App] graphql-upload module loaded but did not export middleware');
    }
  } catch (err: any) {
    console.warn('[App] graphql-upload not available, uploads will be disabled:', err && err.message ? err.message : err);
  }

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
        incidentService,
        eventService,
        reportService,
        documentService,
        notificationService,
        chatService,
      };
    },
    })
  );

  // GraphQL Voyager (schema visualizer)
  app.use(
    '/voyager',
    voyagerMiddleware({
      endpointUrl: '/graphql',
      displayOptions: {
        sortByAlphabet: true,
        showLeafFields: true,
        skipRelay: false,
        skipDeprecated: false,
      },
    }) as any
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return { app, httpServer, apolloServer };
}

export default express();

