import MessageModel from '../models/Message';
import IMessageRepository, { CreateMessagePayload, ListMessagesParams } from '../../../../domain/repositories/IMessageRepository';
import MessageEntity from '../../../../domain/entities/Message';
import mongoose from 'mongoose';

class MessageRepository implements IMessageRepository {
  async create(payload: CreateMessagePayload): Promise<MessageEntity> {
    const doc = await MessageModel.create({
      chatId: payload.chatId as any,
      from: payload.from as any,
      to: payload.to as any,
      text: payload.text,
      attachments: payload.attachments || [],
      type: payload.type || 'text',
    });

    return this.toEntity(doc);
  }

  async findById(id: string): Promise<MessageEntity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await MessageModel.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async listByChat(chatId: string, params?: ListMessagesParams): Promise<MessageEntity[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const docs = await MessageModel.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();

    return docs.map((d) => this.toEntity(d));
  }

  async countByChat(chatId: string): Promise<number> {
    return MessageModel.countDocuments({ chatId }).exec();
  }

  private toEntity(doc: any): MessageEntity {
    return {
      id: doc._id.toString(),
      chatId: typeof doc.chatId === 'object' ? doc.chatId._id?.toString() || doc.chatId : doc.chatId.toString(),
      from: typeof doc.from === 'object' ? doc.from._id?.toString() || doc.from : doc.from.toString(),
      to: doc.to ? (typeof doc.to === 'object' ? doc.to._id?.toString() || doc.to : doc.to.toString()) : undefined,
      text: doc.text,
      attachments: doc.attachments || [],
      type: doc.type,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new MessageRepository();
