import { NotificationType } from '../../domain/entities/Notification';

// DTO para filtrar notificaciones
export interface NotificationFilters {
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

// DTO para marcar notificaciones como leídas (múltiples)
export interface MarkNotificationsAsReadInput {
  notificationIds: string[];
}
