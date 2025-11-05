// Tipos de notificación disponibles
export enum NotificationType {
  // Reportes
  REPORT_SUBMITTED = 'report_submitted',
  REPORT_APPROVED = 'report_approved',
  REPORT_REJECTED = 'report_rejected',

  // Proyectos
  PROJECT_MEMBER_ADDED = 'project_member_added',

  // Tareas
  TASK_ASSIGNED = 'task_assigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_COMPLETED = 'task_completed',
  TASK_REJECTED = 'task_rejected',
  TASK_DELAYED = 'task_delayed',

  // (Futuro) Chat
  CHAT_MESSAGE = 'chat_message',
}

// Tipo de entidad relacionada
export type RelatedEntityType = 'project' | 'task' | 'report' | 'document' | 'chat';

// Entidad principal de Notificación
export interface Notification {
  id: string;
  recipientId: string; // Usuario que recibe la notificación
  type: NotificationType; // Tipo de notificación
  title: string; // Título breve
  message: string; // Mensaje descriptivo

  // Metadata para deep linking
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  link?: string; // URL/deep link opcional

  // Estado
  read: boolean; // Leído o no
  readAt?: Date; // Cuándo se leyó

  // Actor (quién generó la acción)
  actorId?: string; // Usuario que generó la notificación
  actorName?: string; // Nombre para mostrar

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
