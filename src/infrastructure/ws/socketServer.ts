import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import jwt from 'jsonwebtoken';
import { chatService, messageService } from '../container';

export function initSocketServer(httpServer: http.Server) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const pubClient = new Redis(redisUrl);
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  // Authenticate sockets using JWT passed in `auth` payload (WS), query param, or `authorization` header
  io.use((socket, next) => {
    try {
      const tokenFromAuth = socket.handshake.auth?.token;
      const tokenFromHeader = (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      const tokenFromQuery = (socket.handshake.query && (socket.handshake.query as any).token) || null;
      const token = tokenFromAuth || tokenFromQuery || tokenFromHeader;
      if (!token) {
        console.warn('[WS] auth failed — no token provided for socket', socket.id);
        return next(new Error('Authentication error'));
      }
      const secret = process.env.JWT_SECRET || 'changeme';
      const payload = jwt.verify(token, secret) as any;
      // store user id in socket.data for handlers
      socket.data.userId = payload.sub || payload.id || payload.userId || null;
      if (!socket.data.userId) {
        console.warn('[WS] auth failed — token has no user id', socket.id);
        return next(new Error('Authentication error'));
      }
      return next();
    } catch (err) {
      console.warn('[WS] auth error', err && (err as Error).message);
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[WS] client connected', socket.id);

    socket.on('join', (data: any) => {
      const room = data?.room || data;
      if (!room) return;
      socket.join(room);
      console.log(`[WS] ${socket.id} joined room ${room}`);
    });

    socket.on('leave', (data: any) => {
      const room = data?.room || data;
      if (!room) return;
      socket.leave(room);
      console.log(`[WS] ${socket.id} left room ${room}`);
    });

    socket.on('message:send', async (msg: any) => {
      // msg: { room (chatId), content, attachments?, type?, tempId }
      try {
        if (!msg || !msg.room) {
          socket.emit('message:error', { error: 'room is required' });
          return;
        }

        // Ensure user is allowed to post in this chat
        const userId = socket.data?.userId;
        if (!userId) {
          socket.emit('message:ack', { tempId: msg.tempId || null, success: false, error: 'not authenticated' });
          return;
        }

        // Verify chat and membership (this will throw if not authorized)
        try {
          await chatService.getChatById(msg.room, userId);
        } catch (authErr: any) {
          socket.emit('message:ack', { tempId: msg.tempId || null, success: false, error: authErr?.message || 'not authorized' });
          return;
        }

        // Persist message first (durable strategy)
        const created = await messageService.createMessage({
          chatId: msg.room,
          from: userId,
          text: msg.content || null,
          attachments: msg.attachments || [],
          type: msg.type || 'text',
        });

        // Emit to room with persisted message
        io.to(msg.room).emit('message:new', created);

        // Ack sender with created id so client can reconcile
        socket.emit('message:ack', { tempId: msg.tempId || null, success: true, messageId: created.id, message: created });
      } catch (err: any) {
        console.error('[WS] message:send error', err);
        socket.emit('message:ack', { tempId: msg?.tempId || null, success: false, error: err?.message || String(err) });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] client disconnected', socket.id, reason);
    });
  });

  return io;
}

