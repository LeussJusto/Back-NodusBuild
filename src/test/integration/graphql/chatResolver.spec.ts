import chatResolver from '../../../interface/graphql/resolvers/chatResolver';
import { ChatService } from '../../../application/services/ChatService';
import { ChatEntity, ChatType, ParticipantRole } from '../../../domain/entities/Chat';

// Mock del servicio
const mockChatService = {
  createOrGetDirectChat: jest.fn(),
  createOrGetProjectChat: jest.fn(),
  createGroupChat: jest.fn(),
  getMyChats: jest.fn(),
  getChatById: jest.fn(),
  addParticipant: jest.fn(),
  removeParticipant: jest.fn(),
  leaveChat: jest.fn(),
  updateChatTitle: jest.fn(),
} as unknown as jest.Mocked<ChatService>;

function makeChat(overrides: Partial<ChatEntity> = {}): ChatEntity {
  return {
    id: 'chat1',
    type: ChatType.DIRECT,
    participants: [
      { userId: 'user1', role: ParticipantRole.MEMBER, joinedAt: new Date() },
      { userId: 'user2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Integration/chatResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.myChats', () => {
    it('returns user chats with default params', async () => {
      const chats = [makeChat(), makeChat({ id: 'chat2' })];
      mockChatService.getMyChats.mockResolvedValue(chats);

      const result = await chatResolver.Query.myChats(
        {},
        {},
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.getMyChats).toHaveBeenCalledWith({}, 'user1');
      expect(result).toEqual(chats);
      expect(result).toHaveLength(2);
    });

    it('returns user chats with pagination', async () => {
      const chats = [makeChat()];
      mockChatService.getMyChats.mockResolvedValue(chats);

      const result = await chatResolver.Query.myChats(
        {},
        { input: { limit: 10, offset: 5 } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.getMyChats).toHaveBeenCalledWith({ limit: 10, offset: 5 }, 'user1');
      expect(result).toEqual(chats);
    });

    it('throws if not authenticated', async () => {
      await expect(
        chatResolver.Query.myChats(
          {},
          {},
          { chatService: mockChatService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Query.chat', () => {
    it('returns chat by id', async () => {
      const chat = makeChat();
      mockChatService.getChatById.mockResolvedValue(chat);

      const result = await chatResolver.Query.chat(
        {},
        { id: 'chat1' },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.getChatById).toHaveBeenCalledWith('chat1', 'user1');
      expect(result).toEqual(chat);
    });

    it('throws if not authenticated', async () => {
      await expect(
        chatResolver.Query.chat(
          {},
          { id: 'chat1' },
          { chatService: mockChatService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.createDirectChat', () => {
    it('creates direct chat with valid input', async () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      mockChatService.createOrGetDirectChat.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.createDirectChat(
        {},
        { input: { peerId: 'user2' } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.createOrGetDirectChat).toHaveBeenCalledWith({ peerId: 'user2' }, 'user1');
      expect(result).toEqual(chat);
    });

    it('throws on invalid peer id', async () => {
      await expect(
        chatResolver.Mutation.createDirectChat(
          {},
          { input: { peerId: '' } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws if not authenticated', async () => {
      await expect(
        chatResolver.Mutation.createDirectChat(
          {},
          { input: { peerId: 'user2' } },
          { chatService: mockChatService } as any
        )
      ).rejects.toThrow('No autenticado');
    });
  });

  describe('Mutation.createProjectChat', () => {
    it('creates project chat with valid input', async () => {
      const chat = makeChat({ type: ChatType.PROJECT, projectId: 'project1' });
      mockChatService.createOrGetProjectChat.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.createProjectChat(
        {},
        { input: { projectId: 'project1' } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.createOrGetProjectChat).toHaveBeenCalledWith({ projectId: 'project1' }, 'user1');
      expect(result).toEqual(chat);
    });

    it('throws on invalid project id', async () => {
      await expect(
        chatResolver.Mutation.createProjectChat(
          {},
          { input: { projectId: '' } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.createGroupChat', () => {
    it('creates group chat with valid input', async () => {
      const chat = makeChat({ 
        type: ChatType.GROUP, 
        title: 'Mi Grupo',
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'user2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      mockChatService.createGroupChat.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.createGroupChat(
        {},
        { input: { title: 'Mi Grupo', memberIds: ['user2'] } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.createGroupChat).toHaveBeenCalledWith(
        { title: 'Mi Grupo', memberIds: ['user2'] },
        'user1'
      );
      expect(result).toEqual(chat);
    });

    it('throws on invalid title length (too short)', async () => {
      await expect(
        chatResolver.Mutation.createGroupChat(
          {},
          { input: { title: '', memberIds: ['user2'] } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws on invalid title length (too long)', async () => {
      await expect(
        chatResolver.Mutation.createGroupChat(
          {},
          { input: { title: 'a'.repeat(101), memberIds: ['user2'] } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws on empty memberIds', async () => {
      await expect(
        chatResolver.Mutation.createGroupChat(
          {},
          { input: { title: 'Mi Grupo', memberIds: [] } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.addChatParticipant', () => {
    it('adds participant to chat', async () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'user3', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      mockChatService.addParticipant.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.addChatParticipant(
        {},
        { chatId: 'chat1', input: { userId: 'user3' } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.addParticipant).toHaveBeenCalledWith('chat1', { userId: 'user3' }, 'user1');
      expect(result).toEqual(chat);
    });

    it('throws on invalid user id', async () => {
      await expect(
        chatResolver.Mutation.addChatParticipant(
          {},
          { chatId: 'chat1', input: { userId: '' } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.removeChatParticipant', () => {
    it('removes participant from chat', async () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [{ userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      mockChatService.removeParticipant.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.removeChatParticipant(
        {},
        { chatId: 'chat1', userId: 'user2' },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.removeParticipant).toHaveBeenCalledWith('chat1', 'user2', 'user1');
      expect(result).toEqual(chat);
    });
  });

  describe('Mutation.leaveChat', () => {
    it('allows user to leave chat', async () => {
      mockChatService.leaveChat.mockResolvedValue(undefined);

      const result = await chatResolver.Mutation.leaveChat(
        {},
        { chatId: 'chat1' },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.leaveChat).toHaveBeenCalledWith('chat1', 'user1');
      expect(result).toBe(true);
    });
  });

  describe('Mutation.updateChatTitle', () => {
    it('updates chat title with valid input', async () => {
      const chat = makeChat({ type: ChatType.GROUP, title: 'Nuevo Título' });
      mockChatService.updateChatTitle.mockResolvedValue(chat);

      const result = await chatResolver.Mutation.updateChatTitle(
        {},
        { chatId: 'chat1', input: { title: 'Nuevo Título' } },
        { chatService: mockChatService, user: { id: 'user1' } } as any
      );

      expect(mockChatService.updateChatTitle).toHaveBeenCalledWith('chat1', { title: 'Nuevo Título' }, 'user1');
      expect(result).toEqual(chat);
    });

    it('throws on invalid title length (too short)', async () => {
      await expect(
        chatResolver.Mutation.updateChatTitle(
          {},
          { chatId: 'chat1', input: { title: '' } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });

    it('throws on invalid title length (too long)', async () => {
      await expect(
        chatResolver.Mutation.updateChatTitle(
          {},
          { chatId: 'chat1', input: { title: 'a'.repeat(101) } },
          { chatService: mockChatService, user: { id: 'user1' } } as any
        )
      ).rejects.toThrow();
    });
  });
});
