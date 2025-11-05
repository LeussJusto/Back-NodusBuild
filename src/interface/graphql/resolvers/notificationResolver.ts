import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATIONS_LIMIT, DEFAULT_NOTIFICATIONS_OFFSET } from '../../../shared/constants/notification';
import { NotificationGQL, NotificationFiltersInputGQL, MarkNotificationsAsReadInputGQL } from '../types/notificationTypes';

const notificationResolver = {
  Query: {
    // Obtener mis notificaciones con filtros
    myNotifications: async (
      _: any,
      { filters }: { filters?: NotificationFiltersInputGQL },
      ctx: any
    ): Promise<NotificationGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;

      const FiltersSchema = z.object({
        read: z.boolean().optional(),
        type: z.enum(NOTIFICATION_TYPES as any).optional(),
        limit: z.number().int().positive().max(200).optional().default(DEFAULT_NOTIFICATIONS_LIMIT),
        offset: z.number().int().min(0).optional().default(DEFAULT_NOTIFICATIONS_OFFSET),
      }).optional();

      const parsed = FiltersSchema.parse(filters);

      const items = await notificationService.getMyNotifications(userId, parsed);

      return items.map((n: any) => ({
        ...n,
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : null,
      }));
    },
    // Contar mis notificaciones no leídas
    unreadNotificationsCount: async (_: any, __: any, ctx: any): Promise<number> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;
      return notificationService.getUnreadCount(userId);
    },
    // Obtener una notificación por ID
    notification: async (_: any, { id }: { id: string }, ctx: any): Promise<NotificationGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;
      const n = await notificationService.getNotificationById(id, userId);
      return {
        ...n,
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : null,
      } as any;
    },
  },

  Mutation: {
    // Marcar una notificación como leída
    markNotificationAsRead: async (_: any, { id }: { id: string }, ctx: any): Promise<NotificationGQL> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;

      const n = await notificationService.markAsRead(id, userId);
      return {
        ...n,
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : null,
      } as any;
    },
    // Marcar múltiples notificaciones como leídas
    markNotificationsAsRead: async (
      _: any,
      { input }: { input: MarkNotificationsAsReadInputGQL },
      ctx: any
    ): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;

      const Schema = z.object({
        notificationIds: z.array(z.string().min(1)).min(1),
      });
      const parsed = Schema.parse(input);

      return notificationService.markMultipleAsRead(parsed, userId);
    },
    // Marcar todas las notificaciones como leídas
    markAllNotificationsAsRead: async (_: any, __: any, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;
      return notificationService.markAllAsRead(userId);
    },
    // Eliminar una notificación
    deleteNotification: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { notificationService } = ctx;
      return notificationService.deleteNotification(id, userId);
    },
  },
};

export default notificationResolver;
