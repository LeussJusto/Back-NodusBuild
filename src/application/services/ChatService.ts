import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import ChatEntity, { ChatType, ParticipantRole } from '../../domain/entities/Chat';
import {
  canViewMessages,
  ensureCanCreateDirectChat,
  ensureCanCreateProjectChat,
  ensureCanAddParticipant,
  ensureCanRemoveParticipant,
  ensureCanLeaveChat,
} from '../../domain/services/ChatDomainService';
import {
  CreateDirectChatDTO,
  CreateProjectChatDTO,
  CreateGroupChatDTO,
  AddChatParticipantDTO,
  UpdateChatTitleDTO,
  ListChatsDTO,
} from '../dto/chatDTO';
import {
  DEFAULT_CHAT_LIST_LIMIT,
  MAX_CHAT_LIST_LIMIT,
  MIN_GROUP_PARTICIPANTS,
  MAX_GROUP_PARTICIPANTS,
  MIN_GROUP_TITLE_LENGTH,
  MAX_GROUP_TITLE_LENGTH,
} from '../../shared/constants/chat';

export class ChatService {
  private chatRepo: IChatRepository;
  private projectRepo: IProjectRepository;

  constructor(chatRepo: IChatRepository, projectRepo: IProjectRepository) {
    this.chatRepo = chatRepo;
    this.projectRepo = projectRepo;
  }

  // Crear o reutilizar chat DIRECT (1-a-1)
  async createOrGetDirectChat(dto: CreateDirectChatDTO, initiatorId: string): Promise<ChatEntity> {
    ensureCanCreateDirectChat(initiatorId, dto.peerId);

    // Buscar si ya existe chat directo entre estos dos usuarios
    const existing = await this.chatRepo.findDirectByMembers(initiatorId, dto.peerId);
    if (existing) return existing;

    // Crear nuevo chat directo
    const chat = await this.chatRepo.create({
      type: ChatType.DIRECT,
      participants: [
        { userId: initiatorId, role: ParticipantRole.MEMBER },
        { userId: dto.peerId, role: ParticipantRole.MEMBER },
      ],
    });

    return chat;
  }

  // Crear o reutilizar chat de PROYECTO
  async createOrGetProjectChat(dto: CreateProjectChatDTO, initiatorId: string): Promise<ChatEntity> {
    const project = await this.projectRepo.findById(dto.projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    ensureCanCreateProjectChat(initiatorId, project);

    // Buscar si ya existe chat del proyecto (por convención, un PROJECT solo tiene un chat)
    const chats = await this.chatRepo.listByUser(initiatorId, { limit: MAX_CHAT_LIST_LIMIT });
    const existing = chats.find((c) => c.type === ChatType.PROJECT && c.projectId === dto.projectId);
    if (existing) return existing;

    // Crear chat del proyecto con todos los miembros actuales
    const participants = [
      { userId: project.owner, role: ParticipantRole.ADMIN },
      ...project.team.map((tm) => ({ userId: tm.user, role: ParticipantRole.MEMBER })),
    ];

    // Eliminar duplicados (owner puede estar en team también)
    const uniqueParticipants = Array.from(
      new Map(participants.map((p) => [p.userId, p])).values()
    );

    const chat = await this.chatRepo.create({
      type: ChatType.PROJECT,
      projectId: dto.projectId,
      title: project.name,
      participants: uniqueParticipants,
    });

    return chat;
  }

  // Crear chat de GRUPO
  async createGroupChat(dto: CreateGroupChatDTO, initiatorId: string): Promise<ChatEntity> {
    // Validar longitud del título
    if (dto.title.length < MIN_GROUP_TITLE_LENGTH || dto.title.length > MAX_GROUP_TITLE_LENGTH) {
      throw new Error(`El título debe tener entre ${MIN_GROUP_TITLE_LENGTH} y ${MAX_GROUP_TITLE_LENGTH} caracteres`);
    }

    // El dominio valida que haya al menos 2 usuarios únicos (initiator + members)
    const unique = Array.from(new Set([initiatorId, ...dto.memberIds]));
    if (unique.length < MIN_GROUP_PARTICIPANTS) {
      throw new Error(`El grupo debe tener al menos ${MIN_GROUP_PARTICIPANTS} participantes`);
    }

    if (unique.length > MAX_GROUP_PARTICIPANTS) {
      throw new Error(`El grupo no puede tener más de ${MAX_GROUP_PARTICIPANTS} participantes`);
    }

    const participants = unique.map((uid) => ({
      userId: uid,
      role: uid === initiatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
    }));

    const chat = await this.chatRepo.create({
      type: ChatType.GROUP,
      title: dto.title,
      participants,
    });

    return chat;
  }

  // Obtener chats del usuario
  async getMyChats(dto: ListChatsDTO, userId: string): Promise<ChatEntity[]> {
    const limit = Math.min(dto.limit || DEFAULT_CHAT_LIST_LIMIT, MAX_CHAT_LIST_LIMIT);
    const offset = dto.offset || 0;
    const chats = await this.chatRepo.listByUser(userId, { limit, offset });
    return chats;
  }

  // Obtener chat por ID (verificando acceso)
  async getChatById(chatId: string, userId: string): Promise<ChatEntity> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    if (!canViewMessages(userId, chat)) {
      throw new Error('No tienes acceso a este chat');
    }

    return chat;
  }

  // Agregar participante a chat (GROUP o PROJECT)
  async addParticipant(
    chatId: string,
    dto: AddChatParticipantDTO,
    actorId: string
  ): Promise<ChatEntity> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    // Si es PROJECT, necesitamos validar membresía del proyecto
    let project;
    if (chat.type === ChatType.PROJECT && chat.projectId) {
      project = await this.projectRepo.findById(chat.projectId);
      if (!project) throw new Error('Proyecto asociado no encontrado');
    }

    ensureCanAddParticipant(actorId, chat, dto.userId, project);

    const updated = await this.chatRepo.addParticipant(chatId, {
      userId: dto.userId,
      role: ParticipantRole.MEMBER,
    });

    return updated;
  }

  // Remover participante de chat (GROUP o PROJECT)
  async removeParticipant(
    chatId: string,
    targetUserId: string,
    actorId: string
  ): Promise<ChatEntity> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    // Si es PROJECT, validar owner
    let project;
    if (chat.type === ChatType.PROJECT && chat.projectId) {
      project = await this.projectRepo.findById(chat.projectId);
      if (!project) throw new Error('Proyecto asociado no encontrado');
    }

    ensureCanRemoveParticipant(actorId, chat, targetUserId, project);

    const updated = await this.chatRepo.removeParticipant(chatId, targetUserId);
    return updated;
  }

  // Abandonar chat (GROUP o PROJECT)
  async leaveChat(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    ensureCanLeaveChat(userId, chat);

    await this.chatRepo.removeParticipant(chatId, userId);
  }

  // Actualizar título de chat GROUP
  async updateChatTitle(chatId: string, dto: UpdateChatTitleDTO, userId: string): Promise<ChatEntity> {
    // Validar longitud del título
    if (dto.title.length < MIN_GROUP_TITLE_LENGTH || dto.title.length > MAX_GROUP_TITLE_LENGTH) {
      throw new Error(`El título debe tener entre ${MIN_GROUP_TITLE_LENGTH} y ${MAX_GROUP_TITLE_LENGTH} caracteres`);
    }

    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new Error('Chat no encontrado');

    if (chat.type !== ChatType.GROUP) {
      throw new Error('Solo se puede actualizar el título de chats de grupo');
    }

    if (!canViewMessages(userId, chat)) {
      throw new Error('No tienes acceso a este chat');
    }

    const updated = await this.chatRepo.update(chatId, { title: dto.title });
    return updated;
  }
}

export default ChatService;
