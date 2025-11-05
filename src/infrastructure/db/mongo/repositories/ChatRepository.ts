import ChatModel from '../models/Chat';
import {
  IChatRepository,
  CreateChatPayload,
  UpdateChatPayload,
  AddParticipantPayload,
  ListChatsParams,
} from '../../../../domain/repositories/IChatRepository';
import ChatEntity from '../../../../domain/entities/Chat';

class ChatRepository implements IChatRepository {
  // Crear chat
  async create(payload: CreateChatPayload): Promise<ChatEntity> {
    const chat = await ChatModel.create({
      type: payload.type,
      projectId: payload.projectId,
      title: payload.title,
      participants: payload.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
        joinedAt: new Date(),
      })),
    });

    return this.toEntity(chat);
  }

  // Buscar chat por ID con populate
  async findById(id: string): Promise<ChatEntity | null> {
    const chat = await ChatModel.findById(id)
      .populate('participants.userId', 'email profile')
      .populate('projectId', 'name')
      .exec();

    return chat ? this.toEntity(chat) : null;
  }

  // Buscar chat directo por par de usuarios (sin importar orden)
  async findDirectByMembers(userA: string, userB: string): Promise<ChatEntity | null> {
    const chat = await ChatModel.findOne({
      type: 'direct',
      'participants.userId': { $all: [userA, userB] },
    })
      .populate('participants.userId', 'email profile')
      .exec();

    return chat ? this.toEntity(chat) : null;
  }

  // Listar chats del usuario
  async listByUser(userId: string, params?: ListChatsParams): Promise<ChatEntity[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const chats = await ChatModel.find({
      'participants.userId': userId,
    })
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('participants.userId', 'email profile')
      .populate('projectId', 'name')
      .exec();

    return chats.map((c) => this.toEntity(c));
  }

  // Actualizar chat
  async update(id: string, payload: UpdateChatPayload): Promise<ChatEntity> {
    const chat = await ChatModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate('participants.userId', 'email profile')
      .populate('projectId', 'name')
      .exec();

    if (!chat) throw new Error('Chat no encontrado');
    return this.toEntity(chat);
  }

  // Agregar participante
  async addParticipant(chatId: string, payload: AddParticipantPayload): Promise<ChatEntity> {
    const chat = await ChatModel.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    // Verificar si el usuario ya está en el chat
    if (chat.participants.some((p) => p.userId.toString() === payload.userId)) {
      throw new Error('Usuario ya está en el chat');
    }

    chat.participants.push({
      userId: payload.userId as any,
      role: payload.role,
      joinedAt: new Date(),
    });

    await chat.save();

    // Recargar con populate
    const updated = await ChatModel.findById(chatId)
      .populate('participants.userId', 'email profile')
      .populate('projectId', 'name')
      .exec();

    return this.toEntity(updated!);
  }

  // Remover participante
  async removeParticipant(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await ChatModel.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    chat.participants = chat.participants.filter((p) => p.userId.toString() !== userId);
    await chat.save();

    // Recargar con populate
    const updated = await ChatModel.findById(chatId)
      .populate('participants.userId', 'email profile')
      .populate('projectId', 'name')
      .exec();

    return this.toEntity(updated!);
  }

  // Mapear documento Mongoose a entidad de dominio
  private toEntity(doc: any): ChatEntity {
    return {
      id: doc._id.toString(),
      type: doc.type,
      projectId: doc.projectId ? (typeof doc.projectId === 'object' ? doc.projectId._id?.toString() || doc.projectId : doc.projectId.toString()) : undefined,
      title: doc.title,
      participants: doc.participants.map((p: any) => ({
        userId: typeof p.userId === 'object' ? p.userId._id?.toString() || p.userId : p.userId.toString(),
        role: p.role,
        joinedAt: p.joinedAt,
        lastReadAt: p.lastReadAt,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new ChatRepository();
