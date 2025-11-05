// Constantes de Notification compartidas entre capas
export const NOTIFICATION_TYPES = [
  'report_submitted',
  'report_approved',
  'report_rejected',
  'project_member_added',
  'task_assigned',
  'task_status_changed',
  'task_completed',
  'task_rejected',
  'task_delayed',
  'chat_message',
] as const;

// Tipos de entidad relacionada
export const RELATED_ENTITY_TYPES = ['project', 'task', 'report', 'document', 'chat'] as const;

// Límites de contenido
export const MAX_NOTIFICATION_TITLE_LENGTH = 200;
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 1000;

// Valores por defecto para nuevas notificaciones
export const DEFAULT_NOTIFICATION_READ_STATUS = false;
export const DEFAULT_NOTIFICATIONS_LIMIT = 50;
export const DEFAULT_NOTIFICATIONS_OFFSET = 0;

// Días para auto-limpieza de notificaciones leídas
export const NOTIFICATION_CLEANUP_DAYS = 90;

// Tipos de notificación donde el actor SÍ debe ser notificado (excepciones a la regla)
export const SELF_NOTIFY_TYPES = [
  'report_approved',
  'report_rejected',
  'task_completed',
  'task_rejected',
] as const;
