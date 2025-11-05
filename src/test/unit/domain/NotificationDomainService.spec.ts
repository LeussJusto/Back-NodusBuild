import {
  validateNotificationTitle,
  validateNotificationMessage,
  canDeleteNotification,
  canMarkAsRead,
  shouldNotifyUser,
  formatNotificationMessage,
  isValidNotificationType,
} from '../../../domain/services/NotificationDomainService';
import { Notification, NotificationType } from '../../../domain/entities/Notification';
import {
  MAX_NOTIFICATION_TITLE_LENGTH,
  MAX_NOTIFICATION_MESSAGE_LENGTH,
} from '../../../shared/constants/notification';

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

describe('Domain/NotificationDomainService', () => {
  describe('validateNotificationTitle', () => {
    it('accepts non-empty title within max length', () => {
      expect(() => validateNotificationTitle('Ok')).not.toThrow();
      const maxOk = 'a'.repeat(MAX_NOTIFICATION_TITLE_LENGTH);
      expect(() => validateNotificationTitle(maxOk)).not.toThrow();
    });

    it('throws when title is empty or exceeds max length', () => {
      expect(() => validateNotificationTitle('')).toThrow('El título de la notificación es requerido');
      const tooLong = 'a'.repeat(MAX_NOTIFICATION_TITLE_LENGTH + 1);
      expect(() => validateNotificationTitle(tooLong)).toThrow(
        `El título no puede exceder ${MAX_NOTIFICATION_TITLE_LENGTH} caracteres`
      );
    });
  });

  describe('validateNotificationMessage', () => {
    it('accepts non-empty message within max length', () => {
      expect(() => validateNotificationMessage('Ok')).not.toThrow();
      const maxOk = 'a'.repeat(MAX_NOTIFICATION_MESSAGE_LENGTH);
      expect(() => validateNotificationMessage(maxOk)).not.toThrow();
    });

    it('throws when message is empty or exceeds max length', () => {
      expect(() => validateNotificationMessage('')).toThrow('El mensaje de la notificación es requerido');
      const tooLong = 'a'.repeat(MAX_NOTIFICATION_MESSAGE_LENGTH + 1);
      expect(() => validateNotificationMessage(tooLong)).toThrow(
        `El mensaje no puede exceder ${MAX_NOTIFICATION_MESSAGE_LENGTH} caracteres`
      );
    });
  });

  describe('canMarkAsRead / canDeleteNotification', () => {
    it('returns true only for the recipient', () => {
      const n = makeNotification({ recipientId: 'u1' });
      expect(canMarkAsRead('u1', n)).toBe(true);
      expect(canMarkAsRead('u2', n)).toBe(false);
      expect(canDeleteNotification('u1', n)).toBe(true);
      expect(canDeleteNotification('u2', n)).toBe(false);
    });
  });

  describe('shouldNotifyUser', () => {
    it('does not notify actor for most types (e.g., report_submitted)', () => {
      expect(shouldNotifyUser('u1', 'u1', NotificationType.REPORT_SUBMITTED)).toBe(false);
    });

    it('notifies actor for self-notify types (e.g., report_approved)', () => {
      expect(shouldNotifyUser('u1', 'u1', NotificationType.REPORT_APPROVED)).toBe(true);
    });

    it('notifies different user', () => {
      expect(shouldNotifyUser('u2', 'u1', NotificationType.REPORT_SUBMITTED)).toBe(true);
    });
  });

  describe('formatNotificationMessage', () => {
    it('formats report_submitted with actorName and projectName', () => {
      const { title, message } = formatNotificationMessage(
        NotificationType.REPORT_SUBMITTED,
        { projectName: 'Proyecto X', actorName: 'Alice' }
      );
      expect(title).toContain('Nuevo reporte');
      expect(message).toContain('Alice');
      expect(message).toContain('Proyecto X');
      expect(title.length).toBeGreaterThan(0);
      expect(message.length).toBeGreaterThan(0);
    });

    it('formats report_approved and report_rejected with actorName', () => {
      const approved = formatNotificationMessage(
        NotificationType.REPORT_APPROVED,
        { actorName: 'Bob' }
      );
      expect(approved.title).toContain('aprobado');
      expect(approved.message).toContain('Bob');

      const rejected = formatNotificationMessage(
        NotificationType.REPORT_REJECTED,
        { actorName: 'Carol' }
      );
      expect(rejected.title).toContain('rechazado');
      expect(rejected.message).toContain('Carol');
    });

    it('formats project_member_added with projectName and roleName', () => {
      const { title, message } = formatNotificationMessage(
        NotificationType.PROJECT_MEMBER_ADDED,
        { projectName: 'Obra 1', roleName: 'ingeniero' }
      );
      expect(title).toContain('Nuevo proyecto');
      expect(message).toContain('Obra 1');
      expect(message).toContain('ingeniero');
    });

    it('formats task_assigned and task_status_changed including task data', () => {
      const assigned = formatNotificationMessage(
        NotificationType.TASK_ASSIGNED,
        { taskTitle: 'Tarea A', actorName: 'Dana' }
      );
      expect(assigned.title).toContain('tarea');
      expect(assigned.message).toContain('Tarea A');
      expect(assigned.message).toContain('Dana');

      const changed = formatNotificationMessage(
        NotificationType.TASK_STATUS_CHANGED,
        { taskTitle: 'Tarea A', status: 'en_progreso' }
      );
      expect(changed.title).toContain('Estado');
      expect(changed.message).toContain('Tarea A');
      expect(changed.message).toContain('en_progreso');
    });
  });

  describe('isValidNotificationType', () => {
    it('returns true for valid types and false otherwise', () => {
      expect(isValidNotificationType('report_submitted')).toBe(true);
      expect(isValidNotificationType('foo_bar')).toBe(false);
    });
  });
});
