import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType, RelatedEntityType } from '../../../../domain/entities/Notification';

// Interface del documento principal de Notification
export interface INotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  link?: string;
  read: boolean;
  readAt?: Date;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification schema
const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    relatedEntityType: {
      type: String,
      enum: ['project', 'task', 'report', 'document', 'chat'],
    },
    relatedEntityId: {
      type: String,
    },
    link: {
      type: String,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para consultas eficientes
notificationSchema.index({ recipientId: 1, createdAt: -1 }); 
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 }); 
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }); 

export const NotificationModel = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);
