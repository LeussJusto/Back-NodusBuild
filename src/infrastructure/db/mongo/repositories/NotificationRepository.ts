import {
  INotificationRepository,
  CreateNotificationPayload,
} from '../../../../domain/repositories/INotificationRepository';
import { Notification } from '../../../../domain/entities/Notification';
import { NotificationModel } from '../models/Notification';

class NotificationRepository implements INotificationRepository {
  // Crear una notificación
  async create(payload: CreateNotificationPayload): Promise<Notification> {
    const newNotification = await NotificationModel.create(payload);
    return this.mapToEntity(newNotification);
  }

  // Crear múltiples notificaciones en bulk
  async createBulk(payloads: CreateNotificationPayload[]): Promise<Notification[]> {
    const notifications = await NotificationModel.insertMany(payloads);
    return notifications.map((notification) => this.mapToEntity(notification));
  }

  // Buscar notificación por ID
  async findById(id: string): Promise<Notification | null> {
    const notification = await NotificationModel.findById(id)
      .populate('recipientId', 'email profile')
      .populate('actorId', 'email profile')
      .exec();

    return notification ? this.mapToEntity(notification) : null;
  }

  // Buscar notificaciones por destinatario con paginación
  async findByRecipient(
    recipientId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const notifications = await NotificationModel.find({ recipientId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('actorId', 'email profile')
      .exec();

    return notifications.map((notification) => this.mapToEntity(notification));
  }

  // Buscar notificaciones no leídas por destinatario
  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    const notifications = await NotificationModel.find({
      recipientId,
      read: false,
    })
      .sort({ createdAt: -1 })
      .populate('actorId', 'email profile')
      .exec();

    return notifications.map((notification) => this.mapToEntity(notification));
  }

  // Contar notificaciones no leídas por destinatario
  async countUnreadByRecipient(recipientId: string): Promise<number> {
    return NotificationModel.countDocuments({
      recipientId,
      read: false,
    }).exec();
  }

  // Marcar una notificación como leída
  async markAsRead(id: string): Promise<Notification | null> {
    const updatedNotification = await NotificationModel.findByIdAndUpdate(
      id,
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('recipientId', 'email profile')
      .populate('actorId', 'email profile')
      .exec();

    return updatedNotification ? this.mapToEntity(updatedNotification) : null;
  }

  // Marcar múltiples notificaciones como leídas
  async markMultipleAsRead(ids: string[]): Promise<number> {
    const result = await NotificationModel.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    ).exec();

    return result.modifiedCount;
  }

  // Marcar todas las notificaciones de un destinatario como leídas
  async markAllAsReadByRecipient(recipientId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { recipientId, read: false },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    ).exec();

    return result.modifiedCount;
  }

  // Eliminar una notificación
  async delete(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  // Eliminar notificaciones más antiguas que una fecha (limpieza)
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await NotificationModel.deleteMany({
      createdAt: { $lt: date },
      read: true, 
    }).exec();

    return result.deletedCount;
  }

  // Mapea el documento de Mongoose a la entidad de dominio
  private mapToEntity(doc: any): Notification {
    return {
      id: doc._id.toString(),
      recipientId: doc.recipientId?._id?.toString() || doc.recipientId?.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      relatedEntityType: doc.relatedEntityType,
      relatedEntityId: doc.relatedEntityId,
      link: doc.link,
      read: doc.read,
      readAt: doc.readAt,
      actorId: doc.actorId?._id?.toString() || doc.actorId?.toString(),
      actorName: doc.actorName,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new NotificationRepository();
