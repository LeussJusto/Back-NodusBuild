import { Notification, NotificationType } from '../entities/Notification';
import {
  MAX_NOTIFICATION_TITLE_LENGTH,
  MAX_NOTIFICATION_MESSAGE_LENGTH,
  SELF_NOTIFY_TYPES,
} from '../../shared/constants/notification';

// Validar longitud del título
export function validateNotificationTitle(title: string): void {
  if (!title || title.trim() === '') {
    throw new Error('El título de la notificación es requerido');
  }

  if (title.length > MAX_NOTIFICATION_TITLE_LENGTH) {
    throw new Error(`El título no puede exceder ${MAX_NOTIFICATION_TITLE_LENGTH} caracteres`);
  }
}

// Validar longitud del mensaje
export function validateNotificationMessage(message: string): void {
  if (!message || message.trim() === '') {
    throw new Error('El mensaje de la notificación es requerido');
  }

  if (message.length > MAX_NOTIFICATION_MESSAGE_LENGTH) {
    throw new Error(`El mensaje no puede exceder ${MAX_NOTIFICATION_MESSAGE_LENGTH} caracteres`);
  }
}

// ¿El usuario puede eliminar esta notificación?
// Solo el destinatario puede eliminar su propia notificación
export function canDeleteNotification(userId: string, notification: Notification): boolean {
  return notification.recipientId === userId;
}

// ¿El usuario puede marcar como leída esta notificación?
// Solo el destinatario puede marcar como leída su propia notificación
export function canMarkAsRead(userId: string, notification: Notification): boolean {
  return notification.recipientId === userId;
}

// ¿Se debe notificar al usuario?
// No notificar al actor de su propia acción (excepto en algunos casos específicos)
export function shouldNotifyUser(
  userId: string,
  actorId: string | undefined,
  type: NotificationType
): boolean {
  // Si el usuario es el actor, no notificar (salvo excepciones)
  if (userId === actorId) {
    // Excepciones: el usuario puede querer saber cuando su reporte fue aprobado/rechazado
    return SELF_NOTIFY_TYPES.includes(type as any);
  }

  return true;
}

// Formatear mensaje según el tipo de notificación
export function formatNotificationMessage(
  type: NotificationType,
  data: {
    projectName?: string;
    taskTitle?: string;
    reportTitle?: string;
    roleName?: string;
    status?: string;
    actorName?: string;
  }
): { title: string; message: string } {
  switch (type) {
    case NotificationType.REPORT_SUBMITTED:
      return {
        title: 'Nuevo reporte para revisar',
        message: `${data.actorName || 'Un miembro'} ha enviado un reporte para revisión en el proyecto ${data.projectName || 'sin nombre'}`,
      };

    case NotificationType.REPORT_APPROVED:
      return {
        title: 'Reporte aprobado',
        message: `Tu reporte ha sido aprobado por ${data.actorName || 'el residente'}`,
      };

    case NotificationType.REPORT_REJECTED:
      return {
        title: 'Reporte rechazado',
        message: `Tu reporte ha sido rechazado por ${data.actorName || 'el residente'}. Revisa los comentarios para más detalles.`,
      };

    case NotificationType.PROJECT_MEMBER_ADDED:
      return {
        title: 'Nuevo proyecto asignado',
        message: `Has sido agregado al proyecto ${data.projectName || 'sin nombre'} con el rol de ${data.roleName || 'miembro'}`,
      };

    case NotificationType.TASK_ASSIGNED:
      return {
        title: 'Nueva tarea asignada',
        message: `${data.actorName || 'Un miembro'} te ha asignado la tarea: ${data.taskTitle || 'sin título'}`,
      };

    case NotificationType.TASK_STATUS_CHANGED:
      return {
        title: 'Estado de tarea actualizado',
        message: `La tarea "${data.taskTitle || 'sin título'}" cambió a estado: ${data.status || 'desconocido'}`,
      };

    case NotificationType.TASK_COMPLETED:
      return {
        title: 'Tarea completada',
        message: `La tarea "${data.taskTitle || 'sin título'}" ha sido completada`,
      };

    case NotificationType.TASK_REJECTED:
      return {
        title: 'Tarea rechazada',
        message: `La tarea "${data.taskTitle || 'sin título'}" ha sido marcada como no completada`,
      };

    case NotificationType.TASK_DELAYED:
      return {
        title: 'Tarea retrasada',
        message: `La tarea "${data.taskTitle || 'sin título'}" ha sido marcada como retrasada`,
      };

    case NotificationType.CHAT_MESSAGE:
      return {
        title: 'Nuevo mensaje',
        message: `${data.actorName || 'Un usuario'} te ha enviado un mensaje`,
      };

    default:
      return {
        title: 'Nueva notificación',
        message: 'Tienes una nueva notificación',
      };
  }
}

// Validar tipo de notificación
export function isValidNotificationType(type: string): type is NotificationType {
  return Object.values(NotificationType).includes(type as NotificationType);
}
