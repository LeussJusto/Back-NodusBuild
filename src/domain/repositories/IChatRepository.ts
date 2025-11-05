import ChatEntity, { ChatType, ParticipantRole } from '../entities/Chat';

export interface CreateChatPayload {
  type: ChatType;
  projectId?: string;
  title?: string;
  participants: { userId: string; role: ParticipantRole }[];
}

export interface UpdateChatPayload {
  title?: string;
  updatedAt?: Date;
}

export interface AddParticipantPayload {
  userId: string;
  role: ParticipantRole;
}

export interface ListChatsParams {
  limit?: number;
  offset?: number;
}

export interface IChatRepository {
  create(payload: CreateChatPayload): Promise<ChatEntity>;
  findById(id: string): Promise<ChatEntity | null>;
  findDirectByMembers(userA: string, userB: string): Promise<ChatEntity | null>;
  listByUser(userId: string, params?: ListChatsParams): Promise<ChatEntity[]>;
  update(id: string, payload: UpdateChatPayload): Promise<ChatEntity>;
  addParticipant(chatId: string, payload: AddParticipantPayload): Promise<ChatEntity>;
  removeParticipant(chatId: string, userId: string): Promise<ChatEntity>;
}

export default IChatRepository;
