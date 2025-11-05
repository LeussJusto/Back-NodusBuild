import { Notification, NotificationType, RelatedEntityType } from '../entities/Notification';

// Payload para crear una notificación
export interface CreateNotificationPayload {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  link?: string;
  actorId?: string;
  actorName?: string;
}

// Payload para actualizar una notificación (solo campos editables)
export interface UpdateNotificationPayload {
  read?: boolean;
  readAt?: Date;
}

// Filtros para listados de notificaciones
export interface NotificationListFilters {
  recipientId?: string;
  type?: NotificationType;
  read?: boolean;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Interfaz del repositorio de notificaciones - define operaciones de persistencia
export interface INotificationRepository {
  create(payload: CreateNotificationPayload): Promise<Notification>;
  createBulk(payloads: CreateNotificationPayload[]): Promise<Notification[]>;

  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string, limit?: number, offset?: number): Promise<Notification[]>;
  findUnreadByRecipient(recipientId: string): Promise<Notification[]>;
  countUnreadByRecipient(recipientId: string): Promise<number>;

  markAsRead(id: string): Promise<Notification | null>;
  markMultipleAsRead(ids: string[]): Promise<number>;
  markAllAsReadByRecipient(recipientId: string): Promise<number>;

  delete(id: string): Promise<boolean>;
  deleteOlderThan(date: Date): Promise<number>; // Limpieza de notificaciones antiguas
}

export default INotificationRepository;
