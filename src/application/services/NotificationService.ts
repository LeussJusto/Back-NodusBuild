import {
  INotificationRepository,
  CreateNotificationPayload,
} from '../../domain/repositories/INotificationRepository';
import { Notification, NotificationType } from '../../domain/entities/Notification';
import * as NotificationDomainService from '../../domain/services/NotificationDomainService';
import { NotificationFilters, MarkNotificationsAsReadInput } from '../dto/notificationDTO';
import {
  DEFAULT_NOTIFICATIONS_LIMIT,
  DEFAULT_NOTIFICATIONS_OFFSET,
} from '../../shared/constants/notification';

//Puerto de servicio de notificaciones
export class NotificationService {
  constructor(private notificationRepository: INotificationRepository) {}
  async getMyNotifications(userId: string, filters?: NotificationFilters): Promise<Notification[]> {
    const limit = filters?.limit || DEFAULT_NOTIFICATIONS_LIMIT;
    const offset = filters?.offset || DEFAULT_NOTIFICATIONS_OFFSET;

    const allNotifications = await this.notificationRepository.findByRecipient(userId, limit, offset);

    // Filtrar por tipo si se especifica
    if (filters?.type) {
      return allNotifications.filter((n) => n.type === filters.type);
    }

    // Filtrar por read/unread si se especifica
    if (filters?.read !== undefined) {
      return allNotifications.filter((n) => n.read === filters.read);
    }

    return allNotifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadByRecipient(userId);
  }

  async getNotificationById(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (!NotificationDomainService.canMarkAsRead(userId, notification)) {
      throw new Error('No tienes permiso para ver esta notificación');
    }

    return notification;
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (!NotificationDomainService.canMarkAsRead(userId, notification)) {
      throw new Error('No tienes permiso para marcar esta notificación como leída');
    }

    if (notification.read) {
      return notification; 
    }

    const updated = await this.notificationRepository.markAsRead(notificationId);
    if (!updated) {
      throw new Error('Error al marcar notificación como leída');
    }

    return updated;
  }

  async markMultipleAsRead(
    input: MarkNotificationsAsReadInput,
    userId: string
  ): Promise<boolean> {
    if (!input.notificationIds || input.notificationIds.length === 0) {
      return true; 
    }

    // Validar que todas las notificaciones pertenecen al usuario
    for (const id of input.notificationIds) {
      const notification = await this.notificationRepository.findById(id);
      if (!notification) {
        throw new Error(`Notificación ${id} no encontrada`);
      }

      if (!NotificationDomainService.canMarkAsRead(userId, notification)) {
        throw new Error(`No tienes permiso para marcar la notificación ${id} como leída`);
      }
    }

    const count = await this.notificationRepository.markMultipleAsRead(input.notificationIds);
    return count > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const count = await this.notificationRepository.markAllAsReadByRecipient(userId);
    return count > 0;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (!NotificationDomainService.canDeleteNotification(userId, notification)) {
      throw new Error('No tienes permiso para eliminar esta notificación');
    }

    return this.notificationRepository.delete(notificationId);
  }

  // ========== HELPERS (para ser llamados por otros servicios) ==========

  async notifyReportSubmitted(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      projectName: string;
      reportId: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.REPORT_SUBMITTED)) {
      return; // No notificar
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.REPORT_SUBMITTED,
      {
        projectName: data.projectName,
        actorName,
      }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.REPORT_SUBMITTED,
      title,
      message,
      relatedEntityType: 'report',
      relatedEntityId: data.reportId,
      link: `/projects/${data.projectId}/reports/${data.reportId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }

  async notifyReportApproved(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      reportId: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.REPORT_APPROVED)) {
      return;
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.REPORT_APPROVED,
      { actorName }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.REPORT_APPROVED,
      title,
      message,
      relatedEntityType: 'report',
      relatedEntityId: data.reportId,
      link: `/projects/${data.projectId}/reports/${data.reportId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }

  async notifyReportRejected(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      reportId: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.REPORT_REJECTED)) {
      return;
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.REPORT_REJECTED,
      { actorName }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.REPORT_REJECTED,
      title,
      message,
      relatedEntityType: 'report',
      relatedEntityId: data.reportId,
      link: `/projects/${data.projectId}/reports/${data.reportId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }

  async notifyProjectMemberAdded(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      projectName: string;
      roleName: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.PROJECT_MEMBER_ADDED)) {
      return;
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.PROJECT_MEMBER_ADDED,
      {
        projectName: data.projectName,
        roleName: data.roleName,
      }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.PROJECT_MEMBER_ADDED,
      title,
      message,
      relatedEntityType: 'project',
      relatedEntityId: data.projectId,
      link: `/projects/${data.projectId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }

  async notifyTaskAssigned(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      taskId: string;
      taskTitle: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.TASK_ASSIGNED)) {
      return;
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.TASK_ASSIGNED,
      {
        taskTitle: data.taskTitle,
        actorName,
      }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.TASK_ASSIGNED,
      title,
      message,
      relatedEntityType: 'task',
      relatedEntityId: data.taskId,
      link: `/projects/${data.projectId}/tasks/${data.taskId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }

  async notifyTaskStatusChanged(
    recipientId: string,
    actorId: string,
    actorName: string,
    data: {
      projectId: string;
      taskId: string;
      taskTitle: string;
      status: string;
    }
  ): Promise<void> {
    if (!NotificationDomainService.shouldNotifyUser(recipientId, actorId, NotificationType.TASK_STATUS_CHANGED)) {
      return;
    }

    const { title, message } = NotificationDomainService.formatNotificationMessage(
      NotificationType.TASK_STATUS_CHANGED,
      {
        taskTitle: data.taskTitle,
        status: data.status,
      }
    );

    NotificationDomainService.validateNotificationTitle(title);
    NotificationDomainService.validateNotificationMessage(message);

    const payload: CreateNotificationPayload = {
      recipientId,
      type: NotificationType.TASK_STATUS_CHANGED,
      title,
      message,
      relatedEntityType: 'task',
      relatedEntityId: data.taskId,
      link: `/projects/${data.projectId}/tasks/${data.taskId}`,
      actorId,
      actorName,
    };

    await this.notificationRepository.create(payload);
  }
}
