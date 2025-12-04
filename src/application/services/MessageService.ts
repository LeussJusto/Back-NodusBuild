import IMessageRepository from '../../domain/repositories/IMessageRepository';
import MessageEntity from '../../domain/entities/Message';

export class MessageService {
  private repo: IMessageRepository;

  constructor(repo: IMessageRepository) {
    this.repo = repo;
  }

  async createMessage(payload: any): Promise<MessageEntity> {
    return this.repo.create(payload);
  }

  async listByChat(chatId: string, limit = 50, offset = 0): Promise<MessageEntity[]> {
    return this.repo.listByChat(chatId, { limit, offset });
  }

  async listByChatWithTotal(chatId: string, limit = 50, offset = 0): Promise<{ items: MessageEntity[]; total: number }> {
    const items = await this.repo.listByChat(chatId, { limit, offset });
    const total = await this.repo.countByChat(chatId);
    return { items, total };
  }
}

export default MessageService;
