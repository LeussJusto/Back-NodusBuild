import { z } from 'zod';
import {
  CreateDirectChatInputGQL,
  CreateProjectChatInputGQL,
  CreateGroupChatInputGQL,
  AddChatParticipantInputGQL,
  UpdateChatTitleInputGQL,
  ListChatsInputGQL,
  ChatGQL,
} from '../types/chatTypes';
import {
  CreateDirectChatDTO,
  CreateProjectChatDTO,
  CreateGroupChatDTO,
  AddChatParticipantDTO,
  UpdateChatTitleDTO,
  ListChatsDTO,
} from '../../../application/dto/chatDTO';
import { ChatType } from '../../../domain/entities/Chat';
import { requireAuth } from '../../../shared/utils/auth';
import {
  MIN_GROUP_TITLE_LENGTH,
  MAX_GROUP_TITLE_LENGTH,
  MAX_CHAT_LIST_LIMIT,
} from '../../../shared/constants/chat';
import UserRepository from '../../../infrastructure/db/mongo/repositories/UserRepository';

const chatResolver = {
  // Field resolvers for nested types
  ChatParticipant: {
    // Resolve userId (stored as string in domain) into a User object for GraphQL
    userId: async (parent: any) => {
      const u = parent?.userId;
      if (!u) return null;
      // If already an object (in case of future populate), return minimal shape
      if (typeof u === 'object') {
        // Normalize to have at least id/email fields expected by User type
        const id = (u.id as string) || (u._id as string) || '';
        return {
          id,
          email: (u.email as string) ?? undefined,
          profile: (u.profile as any) ?? undefined,
        };
      }
      // Otherwise, fetch from repository by id
      try {
        const user = await UserRepository.findById(String(u));
        return user;
      } catch {
        return null;
      }
    },
  },
  Query: {
    // Obtener todos los chats del usuario
    myChats: async (
      _: any,
      { input }: { input?: ListChatsInputGQL },
      ctx: any
    ): Promise<ChatGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const ListChatsSchema = z.object({
        limit: z.number().max(MAX_CHAT_LIST_LIMIT).optional(),
        offset: z.number().min(0).optional(),
        type: z.nativeEnum(ChatType).optional(),
      });

      const parsed = input ? ListChatsSchema.parse(input) : {};
      const dto: ListChatsDTO = parsed;

      const chats = await chatService.getMyChats(dto, userId);
      return chats as ChatGQL[];
    },

    // Obtener un chat por ID (verificando acceso)
    chat: async (_: any, { id }: { id: string }, ctx: any): Promise<ChatGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;
      const chat = await chatService.getChatById(id, userId);
      return chat as ChatGQL;
    },
  },

  Mutation: {
    // Crear chat directo (1-a-1) o reutilizar existente
    createDirectChat: async (
      _: any,
      { input }: { input: CreateDirectChatInputGQL },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const CreateDirectChatSchema = z.object({
        peerId: z.string().min(1, 'El ID del otro usuario es requerido'),
      });

      const parsed = CreateDirectChatSchema.parse(input);
      const dto: CreateDirectChatDTO = parsed;

      const chat = await chatService.createOrGetDirectChat(dto, userId);
      return chat as ChatGQL;
    },

    // Crear chat de proyecto o reutilizar existente
    createProjectChat: async (
      _: any,
      { input }: { input: CreateProjectChatInputGQL },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const CreateProjectChatSchema = z.object({
        projectId: z.string().min(1, 'El ID del proyecto es requerido'),
      });

      const parsed = CreateProjectChatSchema.parse(input);
      const dto: CreateProjectChatDTO = parsed;

      const chat = await chatService.createOrGetProjectChat(dto, userId);
      return chat as ChatGQL;
    },

    // Crear chat de grupo
    createGroupChat: async (
      _: any,
      { input }: { input: CreateGroupChatInputGQL },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const CreateGroupChatSchema = z.object({
        title: z
          .string()
          .min(MIN_GROUP_TITLE_LENGTH, `El título debe tener al menos ${MIN_GROUP_TITLE_LENGTH} caracteres`)
          .max(MAX_GROUP_TITLE_LENGTH, `El título debe tener máximo ${MAX_GROUP_TITLE_LENGTH} caracteres`),
        memberIds: z.array(z.string()).min(1, 'Debe haber al menos un miembro adicional'),
      });

      const parsed = CreateGroupChatSchema.parse(input);
      const dto: CreateGroupChatDTO = parsed;

      const chat = await chatService.createGroupChat(dto, userId);
      return chat as ChatGQL;
    },

    // Agregar participante a chat
    addChatParticipant: async (
      _: any,
      { chatId, input }: { chatId: string; input: AddChatParticipantInputGQL },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const AddChatParticipantSchema = z.object({
        userId: z.string().min(1, 'El ID del usuario es requerido'),
      });

      const parsed = AddChatParticipantSchema.parse(input);
      const dto: AddChatParticipantDTO = parsed;

      const chat = await chatService.addParticipant(chatId, dto, userId);
      return chat as ChatGQL;
    },

    // Remover participante de chat
    removeChatParticipant: async (
      _: any,
      { chatId, userId: targetUserId }: { chatId: string; userId: string },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const chat = await chatService.removeParticipant(chatId, targetUserId, userId);
      return chat as ChatGQL;
    },

    // Abandonar chat
    leaveChat: async (_: any, { chatId }: { chatId: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      await chatService.leaveChat(chatId, userId);
      return true;
    },

    // Actualizar título de chat de grupo
    updateChatTitle: async (
      _: any,
      { chatId, input }: { chatId: string; input: UpdateChatTitleInputGQL },
      ctx: any
    ): Promise<ChatGQL> => {
      const { userId } = requireAuth(ctx);
      const { chatService } = ctx;

      const UpdateChatTitleSchema = z.object({
        title: z
          .string()
          .min(MIN_GROUP_TITLE_LENGTH, `El título debe tener al menos ${MIN_GROUP_TITLE_LENGTH} caracteres`)
          .max(MAX_GROUP_TITLE_LENGTH, `El título debe tener máximo ${MAX_GROUP_TITLE_LENGTH} caracteres`),
      });

      const parsed = UpdateChatTitleSchema.parse(input);
      const dto: UpdateChatTitleDTO = parsed;

      const chat = await chatService.updateChatTitle(chatId, dto, userId);
      return chat as ChatGQL;
    },
  },
};

export default chatResolver;
