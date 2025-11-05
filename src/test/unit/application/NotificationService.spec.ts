import { NotificationService } from '../../../application/services/NotificationService';
import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { Notification, NotificationType } from '../../../domain/entities/Notification';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    recipientId: 'u_recipient',
    type: NotificationType.REPORT_SUBMITTED,
    title: 'Titulo',
    message: 'Mensaje',
    relatedEntityType: 'report',
    relatedEntityId: 'r1',
    link: '/projects/p1/reports/r1',
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Notification;
}

function makeRepo(overrides: Partial<INotificationRepository> = {}) {
  const repo: jest.Mocked<INotificationRepository> = {
    create: jest.fn(),
    findByRecipient: jest.fn(),
    countUnreadByRecipient: jest.fn(),
    findById: jest.fn(),
    markAsRead: jest.fn(),
    markMultipleAsRead: jest.fn(),
    markAllAsReadByRecipient: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as any;

  return repo;
}

describe('Application/NotificationService', () => {
  describe('getMyNotifications', () => {
    it('returns notifications from repository without filters', async () => {
      const repo = makeRepo({ findByRecipient: jest.fn().mockResolvedValue([makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })]) });
      const svc = new NotificationService(repo);
      const res = await svc.getMyNotifications('u1');
      expect(repo.findByRecipient).toHaveBeenCalled();
      expect(res.map(n => n.id)).toEqual(['n1', 'n2']);
    });

    it('filters by type when provided', async () => {
      const items = [
        makeNotification({ id: 'n1', type: NotificationType.REPORT_SUBMITTED }),
        makeNotification({ id: 'n2', type: NotificationType.REPORT_APPROVED }),
      ];
      const repo = makeRepo({ findByRecipient: jest.fn().mockResolvedValue(items) });
      const svc = new NotificationService(repo);
  const res = await svc.getMyNotifications('u1', { type: NotificationType.REPORT_APPROVED, limit: 50, offset: 0 });
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('n2');
    });

    it('filters by read flag when provided', async () => {
      const items = [
        makeNotification({ id: 'n1', read: false }),
        makeNotification({ id: 'n2', read: true }),
      ];
      const repo = makeRepo({ findByRecipient: jest.fn().mockResolvedValue(items) });
      const svc = new NotificationService(repo);
      const unread = await svc.getMyNotifications('u1', { read: false, limit: 50, offset: 0 });
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe('n1');
    });
  });

  describe('getUnreadCount', () => {
    it('delegates to repository', async () => {
      const repo = makeRepo({ countUnreadByRecipient: jest.fn().mockResolvedValue(3) });
      const svc = new NotificationService(repo);
      const res = await svc.getUnreadCount('u1');
      expect(res).toBe(3);
      expect(repo.countUnreadByRecipient).toHaveBeenCalledWith('u1');
    });
  });

  describe('getNotificationById', () => {
    it('returns notification if user is recipient', async () => {
      const n = makeNotification({ id: 'n1', recipientId: 'u1' });
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc = new NotificationService(repo);
      const res = await svc.getNotificationById('n1', 'u1');
      expect(res).toEqual(n);
    });

    it('throws if not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const svc = new NotificationService(repo);
      await expect(svc.getNotificationById('nX', 'u1')).rejects.toThrow('Notificación no encontrada');
    });

    it('throws if user is not recipient', async () => {
      const n = makeNotification({ id: 'n1', recipientId: 'u1' });
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc = new NotificationService(repo);
      await expect(svc.getNotificationById('n1', 'u2')).rejects.toThrow('No tienes permiso para ver esta notificación');
    });
  });

  describe('markAsRead', () => {
    it('marks as read when unread and recipient matches', async () => {
      const n = makeNotification({ id: 'n1', recipientId: 'u1', read: false });
      const updated = { ...n, read: true, readAt: new Date() } as Notification;
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(n), markAsRead: jest.fn().mockResolvedValue(updated) });
      const svc = new NotificationService(repo);
      const res = await svc.markAsRead('n1', 'u1');
      expect(repo.markAsRead).toHaveBeenCalledWith('n1');
      expect(res.read).toBe(true);
    });

    it('returns as-is when already read', async () => {
      const n = makeNotification({ id: 'n1', recipientId: 'u1', read: true, readAt: new Date() });
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc = new NotificationService(repo);
      const res = await svc.markAsRead('n1', 'u1');
      expect(repo.markAsRead).not.toHaveBeenCalled();
      expect(res.read).toBe(true);
    });

    it('throws if not found or user not recipient', async () => {
      const repo1 = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const svc1 = new NotificationService(repo1);
      await expect(svc1.markAsRead('n1', 'u1')).rejects.toThrow('Notificación no encontrada');

      const n = makeNotification({ id: 'n1', recipientId: 'u1', read: false });
      const repo2 = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc2 = new NotificationService(repo2);
      await expect(svc2.markAsRead('n1', 'u2')).rejects.toThrow('No tienes permiso para marcar esta notificación como leída');
    });
  });

  describe('markMultipleAsRead', () => {
    it('returns true immediately for empty list', async () => {
      const repo = makeRepo();
      const svc = new NotificationService(repo);
      await expect(svc.markMultipleAsRead({ notificationIds: [] }, 'u1')).resolves.toBe(true);
      expect(repo.markMultipleAsRead).not.toHaveBeenCalled();
    });

    it('marks multiple when all belong to user', async () => {
      const n1 = makeNotification({ id: 'n1', recipientId: 'u1' });
      const n2 = makeNotification({ id: 'n2', recipientId: 'u1' });
      const repo = makeRepo({
        findById: jest.fn()
          .mockResolvedValueOnce(n1)
          .mockResolvedValueOnce(n2),
        markMultipleAsRead: jest.fn().mockResolvedValue(2),
      });
      const svc = new NotificationService(repo);
      const ok = await svc.markMultipleAsRead({ notificationIds: ['n1', 'n2'] }, 'u1');
      expect(ok).toBe(true);
      expect(repo.markMultipleAsRead).toHaveBeenCalledWith(['n1', 'n2']);
    });

    it('throws if any id not found or not owned by user', async () => {
      const repo1 = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const svc1 = new NotificationService(repo1);
      await expect(svc1.markMultipleAsRead({ notificationIds: ['nX'] }, 'u1')).rejects.toThrow('Notificación nX no encontrada');

      const n = makeNotification({ id: 'n1', recipientId: 'u2' });
      const repo2 = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc2 = new NotificationService(repo2);
      await expect(svc2.markMultipleAsRead({ notificationIds: ['n1'] }, 'u1')).rejects.toThrow('No tienes permiso para marcar la notificación n1 como leída');
    });
  });

  describe('markAllAsRead', () => {
    it('returns true when repository marks any', async () => {
      const repo = makeRepo({ markAllAsReadByRecipient: jest.fn().mockResolvedValue(3) });
      const svc = new NotificationService(repo);
      await expect(svc.markAllAsRead('u1')).resolves.toBe(true);
      expect(repo.markAllAsReadByRecipient).toHaveBeenCalledWith('u1');
    });

    it('returns false when none marked', async () => {
      const repo = makeRepo({ markAllAsReadByRecipient: jest.fn().mockResolvedValue(0) });
      const svc = new NotificationService(repo);
      await expect(svc.markAllAsRead('u1')).resolves.toBe(false);
    });
  });

  describe('deleteNotification', () => {
    it('deletes when user is recipient', async () => {
      const n = makeNotification({ id: 'n1', recipientId: 'u1' });
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(n), delete: jest.fn().mockResolvedValue(true) });
      const svc = new NotificationService(repo);
      await expect(svc.deleteNotification('n1', 'u1')).resolves.toBe(true);
      expect(repo.delete).toHaveBeenCalledWith('n1');
    });

    it('throws if not found or not permitted', async () => {
      const repo1 = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const svc1 = new NotificationService(repo1);
      await expect(svc1.deleteNotification('n1', 'u1')).rejects.toThrow('Notificación no encontrada');

      const n = makeNotification({ id: 'n1', recipientId: 'u2' });
      const repo2 = makeRepo({ findById: jest.fn().mockResolvedValue(n) });
      const svc2 = new NotificationService(repo2);
      await expect(svc2.deleteNotification('n1', 'u1')).rejects.toThrow('No tienes permiso para eliminar esta notificación');
    });
  });

  describe('notify helpers', () => {
    it('notifyReportSubmitted creates a notification for resident (and skips self)', async () => {
      const repo = makeRepo({ create: jest.fn().mockResolvedValue({}) as any });
      const svc = new NotificationService(repo);

      // self-notify should be skipped for REPORT_SUBMITTED
      await svc.notifyReportSubmitted('u1', 'u1', 'Alice', { projectId: 'p1', projectName: 'P', reportId: 'r1' });
      expect(repo.create).not.toHaveBeenCalled();

      // notify another user
      await svc.notifyReportSubmitted('u2', 'u1', 'Alice', { projectId: 'p1', projectName: 'P', reportId: 'r1' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: 'u2',
        type: NotificationType.REPORT_SUBMITTED,
        relatedEntityType: 'report',
        relatedEntityId: 'r1',
        link: '/projects/p1/reports/r1',
      }));
    });

    it('notifyReportApproved creates even when actor == recipient (self-notify allowed)', async () => {
      const repo = makeRepo({ create: jest.fn().mockResolvedValue({}) as any });
      const svc = new NotificationService(repo);
      await svc.notifyReportApproved('u1', 'u1', 'Alice', { projectId: 'p1', reportId: 'r1' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.REPORT_APPROVED }));
    });

    it('notifyProjectMemberAdded creates project-scoped notification', async () => {
      const repo = makeRepo({ create: jest.fn().mockResolvedValue({}) as any });
      const svc = new NotificationService(repo);
      await svc.notifyProjectMemberAdded('u2', 'u1', 'Alice', { projectId: 'p1', projectName: 'P', roleName: 'rol' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.PROJECT_MEMBER_ADDED,
        relatedEntityType: 'project',
        relatedEntityId: 'p1',
        link: '/projects/p1',
      }));
    });

    it('notifyTaskAssigned and notifyTaskStatusChanged create task notifications', async () => {
      const repo = makeRepo({ create: jest.fn().mockResolvedValue({}) as any });
      const svc = new NotificationService(repo);
      await svc.notifyTaskAssigned('u2', 'u1', 'Alice', { projectId: 'p1', taskId: 't1', taskTitle: 'T' });
      await svc.notifyTaskStatusChanged('u2', 'u1', 'Alice', { projectId: 'p1', taskId: 't1', taskTitle: 'T', status: 'en_progreso' });
      const calls = (repo.create as jest.Mock).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((p: any) => p.type === NotificationType.TASK_ASSIGNED && p.relatedEntityType === 'task')).toBe(true);
      expect(calls.some((p: any) => p.type === NotificationType.TASK_STATUS_CHANGED && p.relatedEntityType === 'task')).toBe(true);
    });
  });
});
