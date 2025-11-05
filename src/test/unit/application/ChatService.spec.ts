import { ChatService } from '../../../application/services/ChatService';
import { IChatRepository } from '../../../domain/repositories/IChatRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ChatEntity, ChatType, ParticipantRole } from '../../../domain/entities/Chat';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';
import {
  CreateDirectChatDTO,
  CreateProjectChatDTO,
  CreateGroupChatDTO,
  AddChatParticipantDTO,
  UpdateChatTitleDTO,
  ListChatsDTO,
} from '../../../application/dto/chatDTO';

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

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'project1',
    name: 'Proyecto A',
    description: 'Desc',
    status: ProjectStatus.PLANNING,
    owner: 'owner1',
    team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: ['project_crud'] },
      { user: 'user1', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProjectEntity;
}

function makeRepos() {
  const chatRepo: jest.Mocked<IChatRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findDirectByMembers: jest.fn(),
    listByUser: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    addParticipant: jest.fn(),
    removeParticipant: jest.fn(),
  };

  const projectRepo: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
  };

  return { chatRepo, projectRepo };
}

describe('Application/ChatService', () => {
  describe('createOrGetDirectChat', () => {
    it('creates new direct chat when none exists', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      chatRepo.findDirectByMembers.mockResolvedValue(null);
      const newChat = makeChat({ id: 'newchat1', type: ChatType.DIRECT });
      chatRepo.create.mockResolvedValue(newChat);

      const dto: CreateDirectChatDTO = { peerId: 'user2' };
      const result = await svc.createOrGetDirectChat(dto, 'user1');

      expect(chatRepo.findDirectByMembers).toHaveBeenCalledWith('user1', 'user2');
      expect(chatRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('newchat1');
    });

    it('returns existing direct chat when found', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const existingChat = makeChat({ id: 'existingchat1', type: ChatType.DIRECT });
      chatRepo.findDirectByMembers.mockResolvedValue(existingChat);

      const dto: CreateDirectChatDTO = { peerId: 'user2' };
      const result = await svc.createOrGetDirectChat(dto, 'user1');

      expect(chatRepo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('existingchat1');
    });
  });

  describe('createOrGetProjectChat', () => {
    it('creates new project chat when none exists', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const project = makeProject();
      projectRepo.findById.mockResolvedValue(project);
      chatRepo.findById.mockResolvedValue(null);

      const newChat = makeChat({
        id: 'projectchat1',
        type: ChatType.PROJECT,
        projectId: 'project1',
      });
      chatRepo.create.mockResolvedValue(newChat);

      const dto: CreateProjectChatDTO = { projectId: 'project1' };
      const result = await svc.createOrGetProjectChat(dto, 'user1');

      expect(projectRepo.findById).toHaveBeenCalledWith('project1');
      expect(chatRepo.create).toHaveBeenCalled();
      expect(result.type).toBe(ChatType.PROJECT);
    });
  });

  describe('createGroupChat', () => {
    it('creates group chat with title and members', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const newChat = makeChat({
        id: 'groupchat1',
        type: ChatType.GROUP,
        title: 'Mi Grupo',
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'user2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      chatRepo.create.mockResolvedValue(newChat);

      const dto: CreateGroupChatDTO = { title: 'Mi Grupo', memberIds: ['user2'] };
      const result = await svc.createGroupChat(dto, 'user1');

      expect(chatRepo.create).toHaveBeenCalled();
      expect(result.type).toBe(ChatType.GROUP);
      expect(result.title).toBe('Mi Grupo');
    });
  });

  describe('getMyChats', () => {
    it('returns user chats with default pagination', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chats = [makeChat({ id: 'chat1' }), makeChat({ id: 'chat2' })];
      chatRepo.listByUser.mockResolvedValue(chats);

      const dto: ListChatsDTO = {};
      const result = await svc.getMyChats(dto, 'user1');

      expect(chatRepo.listByUser).toHaveBeenCalledWith('user1', { limit: 50, offset: 0 });
      expect(result).toHaveLength(2);
    });
  });

  describe('getChatById', () => {
    it('returns chat when user is participant', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chat = makeChat();
      chatRepo.findById.mockResolvedValue(chat);

      const result = await svc.getChatById('chat1', 'user1');

      expect(chatRepo.findById).toHaveBeenCalledWith('chat1');
      expect(result.id).toBe('chat1');
    });

    it('throws when chat not found', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      chatRepo.findById.mockResolvedValue(null);

      await expect(svc.getChatById('chat1', 'user1')).rejects.toThrow('Chat no encontrado');
    });
  });

  describe('addParticipant', () => {
    it('adds participant to group chat', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
        ],
      });
      chatRepo.findById.mockResolvedValue(chat);

      const updatedChat = makeChat({
        ...chat,
        participants: [
          ...chat.participants,
          { userId: 'user3', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      chatRepo.addParticipant.mockResolvedValue(updatedChat);

      const dto: AddChatParticipantDTO = { userId: 'user3' };
      const result = await svc.addParticipant('chat1', dto, 'user1');

      expect(chatRepo.addParticipant).toHaveBeenCalled();
      expect(result.participants).toHaveLength(2);
    });
  });

  describe('removeParticipant', () => {
    it('removes participant from group chat', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'user2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      chatRepo.findById.mockResolvedValue(chat);

      const updatedChat = makeChat({
        ...chat,
        participants: [{ userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      chatRepo.removeParticipant.mockResolvedValue(updatedChat);

      const result = await svc.removeParticipant('chat1', 'user2', 'user1');

      expect(chatRepo.removeParticipant).toHaveBeenCalledWith('chat1', 'user2');
      expect(result.participants).toHaveLength(1);
    });
  });

  describe('leaveChat', () => {
    it('allows user to leave group chat', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'user2', role: ParticipantRole.ADMIN, joinedAt: new Date() },
        ],
      });
      chatRepo.findById.mockResolvedValue(chat);

      const updatedChat = makeChat({
        ...chat,
        participants: [{ userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      chatRepo.removeParticipant.mockResolvedValue(updatedChat);

      await svc.leaveChat('chat1', 'user2');

      expect(chatRepo.removeParticipant).toHaveBeenCalledWith('chat1', 'user2');
    });
  });

  describe('updateChatTitle', () => {
    it('updates group chat title', async () => {
      const { chatRepo, projectRepo } = makeRepos();
      const svc = new ChatService(chatRepo, projectRepo);

      const chat = makeChat({
        type: ChatType.GROUP,
        title: 'Old Title',
        participants: [{ userId: 'user1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      chatRepo.findById.mockResolvedValue(chat);

      const updatedChat = makeChat({ ...chat, title: 'New Title' });
      chatRepo.update.mockResolvedValue(updatedChat);

      const dto: UpdateChatTitleDTO = { title: 'New Title' };
      const result = await svc.updateChatTitle('chat1', dto, 'user1');

      expect(chatRepo.update).toHaveBeenCalledWith('chat1', { title: 'New Title' });
      expect(result.title).toBe('New Title');
    });
  });
});
