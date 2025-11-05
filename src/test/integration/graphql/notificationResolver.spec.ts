import notificationResolver from '../../../interface/graphql/resolvers/notificationResolver';
import { NotificationService } from '../../../application/services/NotificationService';
import { Notification, NotificationType } from '../../../domain/entities/Notification';

// Mock del servicio
const mockNotificationService = {
  getMyNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  getNotificationById: jest.fn(),
  markAsRead: jest.fn(),
  markMultipleAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
} as unknown as jest.Mocked<NotificationService>;

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    recipientId: 'u1',
    type: NotificationType.REPORT_SUBMITTED,
    title: 'Titulo',
    message: 'Mensaje',
    relatedEntityType: 'report',
    relatedEntityId: 'r1',
    link: '/projects/p1/reports/r1',
    read: false,
    readAt: undefined,
    actorId: 'u2',
    actorName: 'Alice',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  } as Notification;
}

describe('Integration/notificationResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.myNotifications', () => {
    it('returns notifications with filters', async () => {
      const notifications = [makeNotification(), makeNotification({ id: 'n2', read: true })];
      mockNotificationService.getMyNotifications.mockResolvedValue(notifications);

      const result = await notificationResolver.Query.myNotifications(
        {},
        { filters: { read: false, type: NotificationType.REPORT_SUBMITTED, limit: 10, offset: 0 } },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.getMyNotifications).toHaveBeenCalledWith('u1', {
        read: false,
        type: NotificationType.REPORT_SUBMITTED,
        limit: 10,
        offset: 0,
      });
      expect(result).toHaveLength(2);
      expect(result[0].createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(result[0].readAt).toBeNull();
    });

    it('returns notifications without filters', async () => {
      const notifications = [makeNotification()];
      mockNotificationService.getMyNotifications.mockResolvedValue(notifications);

      const result = await notificationResolver.Query.myNotifications(
        {},
        {},
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.getMyNotifications).toHaveBeenCalledWith('u1', undefined);
      expect(result).toHaveLength(1);
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Query.myNotifications(
          {},
          {},
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });

    it('throws when limit exceeds max of 200', async () => {
      await expect(
        notificationResolver.Query.myNotifications(
          {},
          { filters: { limit: 300 } },
          { notificationService: mockNotificationService, user: { id: 'u1' } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Query.unreadNotificationsCount', () => {
    it('returns unread count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      const result = await notificationResolver.Query.unreadNotificationsCount(
        {},
        {},
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('u1');
      expect(result).toBe(5);
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Query.unreadNotificationsCount(
          {},
          {},
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Query.notification', () => {
    it('returns notification by id', async () => {
      const notification = makeNotification({ readAt: new Date('2024-01-15T11:00:00Z') });
      mockNotificationService.getNotificationById.mockResolvedValue(notification);

      const result = await notificationResolver.Query.notification(
        {},
        { id: 'n1' },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.getNotificationById).toHaveBeenCalledWith('n1', 'u1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('n1');
      expect(result!.readAt).toBe('2024-01-15T11:00:00.000Z');
    });

    it('returns null readAt when undefined', async () => {
      const notification = makeNotification({ readAt: undefined });
      mockNotificationService.getNotificationById.mockResolvedValue(notification);

      const result = await notificationResolver.Query.notification(
        {},
        { id: 'n1' },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(result).not.toBeNull();
      expect(result!.readAt).toBeNull();
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Query.notification(
          {},
          { id: 'n1' },
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.markNotificationAsRead', () => {
    it('marks notification as read', async () => {
      const notification = makeNotification({ read: false });
      const updated = { ...notification, read: true, readAt: new Date('2024-01-15T12:00:00Z') };
      mockNotificationService.markAsRead.mockResolvedValue(updated);

      const result = await notificationResolver.Mutation.markNotificationAsRead(
        {},
        { id: 'n1' },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('n1', 'u1');
      expect(result.read).toBe(true);
      expect(result.readAt).toBe('2024-01-15T12:00:00.000Z');
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Mutation.markNotificationAsRead(
          {},
          { id: 'n1' },
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.markNotificationsAsRead', () => {
    it('marks multiple notifications as read', async () => {
      mockNotificationService.markMultipleAsRead.mockResolvedValue(true);

      const result = await notificationResolver.Mutation.markNotificationsAsRead(
        {},
        { input: { notificationIds: ['n1', 'n2'] } },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.markMultipleAsRead).toHaveBeenCalledWith(
        { notificationIds: ['n1', 'n2'] },
        'u1'
      );
      expect(result).toBe(true);
    });

    it('throws on empty array', async () => {
      await expect(
        notificationResolver.Mutation.markNotificationsAsRead(
          {},
          { input: { notificationIds: [] } },
          { notificationService: mockNotificationService, user: { id: 'u1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws on invalid id format', async () => {
      await expect(
        notificationResolver.Mutation.markNotificationsAsRead(
          {},
          { input: { notificationIds: [''] } },
          { notificationService: mockNotificationService, user: { id: 'u1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Mutation.markNotificationsAsRead(
          {},
          { input: { notificationIds: ['n1'] } },
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.markAllNotificationsAsRead', () => {
    it('marks all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(true);

      const result = await notificationResolver.Mutation.markAllNotificationsAsRead(
        {},
        {},
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('u1');
      expect(result).toBe(true);
    });

    it('returns false when none marked', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(false);

      const result = await notificationResolver.Mutation.markAllNotificationsAsRead(
        {},
        {},
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(result).toBe(false);
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Mutation.markAllNotificationsAsRead(
          {},
          {},
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.deleteNotification', () => {
    it('deletes notification', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(true);

      const result = await notificationResolver.Mutation.deleteNotification(
        {},
        { id: 'n1' },
        { notificationService: mockNotificationService, user: { id: 'u1' } } as any
      );

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('n1', 'u1');
      expect(result).toBe(true);
    });

    it('throws if not authenticated', async () => {
      await expect(
        notificationResolver.Mutation.deleteNotification(
          {},
          { id: 'n1' },
          { notificationService: mockNotificationService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });
});
