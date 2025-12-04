import MessageEntity from '../entities/Message';

export type CreateMessagePayload = {
  chatId: string;
  from: string;
  to?: string | null;
  text?: string | null;
  attachments?: Array<{ url: string; type?: string; filename?: string }>; 
  type?: string;
};

export type ListMessagesParams = {
  limit?: number;
  offset?: number;
};

export interface IMessageRepository {
  create(payload: CreateMessagePayload): Promise<MessageEntity>;
  findById(id: string): Promise<MessageEntity | null>;
  listByChat(chatId: string, params?: ListMessagesParams): Promise<MessageEntity[]>;
  countByChat(chatId: string): Promise<number>;
}

export default IMessageRepository;
