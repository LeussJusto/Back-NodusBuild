import {
  isParticipant,
  findParticipant,
  canCreateDirectChat,
  ensureCanCreateDirectChat,
  canCreateProjectChat,
  ensureCanCreateProjectChat,
  canCreateGroupChat,
  canAddParticipant,
  ensureCanAddParticipant,
  canRemoveParticipant,
  ensureCanRemoveParticipant,
  canViewMessages,
  canLeaveChat,
  ensureCanLeaveChat,
} from '../../../domain/services/ChatDomainService';
import ChatEntity, { ChatType, ParticipantRole } from '../../../domain/entities/Chat';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';

function makeChat(overrides: Partial<ChatEntity> = {}): ChatEntity {
  return {
    id: 'chat1',
    type: ChatType.DIRECT,
    participants: [
      { userId: 'u1', role: ParticipantRole.MEMBER, joinedAt: new Date() },
      { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'p1',
    name: 'Proyecto A',
    status: ProjectStatus.ACTIVE,
    owner: 'owner1',
    team: [
      { user: 'member1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      { user: 'member2', role: ProjectRole.INGENIERO_PRODUCCION, permissions: [] },
    ],
    ...overrides,
  } as ProjectEntity;
}

describe('Domain/ChatDomainService', () => {
  // Helpers básicos
  it('isParticipant returns true for participants and false otherwise', () => {
    const chat = makeChat();
    expect(isParticipant(chat, 'u1')).toBe(true);
    expect(isParticipant(chat, 'u2')).toBe(true);
    expect(isParticipant(chat, 'uX')).toBe(false);
  });

  it('findParticipant returns participant if found, undefined otherwise', () => {
    const chat = makeChat();
    expect(findParticipant(chat, 'u1')).toBeDefined();
    expect(findParticipant(chat, 'u1')?.userId).toBe('u1');
    expect(findParticipant(chat, 'uX')).toBeUndefined();
  });

  // Crear DIRECT
  describe('canCreateDirectChat', () => {
    it('allows when initiator and peer are different', () => {
      expect(canCreateDirectChat('u1', 'u2')).toBe(true);
    });

    it('denies when initiator === peer (no self-chat)', () => {
      expect(canCreateDirectChat('u1', 'u1')).toBe(false);
    });

    it('denies when ids are missing', () => {
      expect(canCreateDirectChat('', 'u2')).toBe(false);
      expect(canCreateDirectChat('u1', '')).toBe(false);
    });
  });

  describe('ensureCanCreateDirectChat', () => {
    it('does not throw for valid pair', () => {
      expect(() => ensureCanCreateDirectChat('u1', 'u2')).not.toThrow();
    });

    it('throws for self-chat with Spanish message', () => {
      expect(() => ensureCanCreateDirectChat('u1', 'u1')).toThrow('No se puede crear un chat directo con los parámetros dados');
    });
  });

  // Crear/Acceder chat PROJECT
  describe('canCreateProjectChat', () => {
    it('allows for project owner', () => {
      const project = makeProject({ owner: 'owner1' });
      expect(canCreateProjectChat('owner1', project)).toBe(true);
    });

    it('allows for project member', () => {
      const project = makeProject({ owner: 'owner1' });
      expect(canCreateProjectChat('member1', project)).toBe(true);
    });

    it('denies for non-member', () => {
      const project = makeProject({ owner: 'owner1' });
      expect(canCreateProjectChat('outsider', project)).toBe(false);
    });
  });

  describe('ensureCanCreateProjectChat', () => {
    it('does not throw for member', () => {
      const project = makeProject({ owner: 'owner1' });
      expect(() => ensureCanCreateProjectChat('member1', project)).not.toThrow();
    });

    it('throws for non-member with Spanish message', () => {
      const project = makeProject({ owner: 'owner1' });
      expect(() => ensureCanCreateProjectChat('outsider', project)).toThrow('Solo miembros del proyecto pueden crear o acceder al chat del proyecto');
    });
  });

  // Crear GROUP
  describe('canCreateGroupChat', () => {
    it('allows with initiator + at least 1 member (2 unique)', () => {
      expect(canCreateGroupChat('u1', ['u2'])).toBe(true);
      expect(canCreateGroupChat('u1', ['u2', 'u3'])).toBe(true);
    });

    it('denies with only initiator (1 unique)', () => {
      expect(canCreateGroupChat('u1', [])).toBe(false);
    });

    it('denies with empty initial members', () => {
      expect(canCreateGroupChat('u1', [])).toBe(false);
    });

    it('denies when initiator is empty', () => {
      expect(canCreateGroupChat('', ['u2'])).toBe(false);
    });
  });

  // Agregar participante
  describe('canAddParticipant', () => {
    it('denies for DIRECT always', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(canAddParticipant('u1', chat, 'u3')).toBe(false);
    });

    it('allows for GROUP when actor is ADMIN', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canAddParticipant('u1', chat, 'u3')).toBe(true);
    });

    it('denies for GROUP when actor is MEMBER', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canAddParticipant('u2', chat, 'u3')).toBe(false);
    });

    it('denies for PROJECT when target is not project member', () => {
      const project = makeProject({ owner: 'owner1' });
      const chat = makeChat({
        type: ChatType.PROJECT,
        projectId: 'p1',
        participants: [{ userId: 'owner1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      expect(canAddParticipant('owner1', chat, 'outsider', project)).toBe(false);
    });

    it('allows for PROJECT when target is project owner', () => {
      const project = makeProject({ owner: 'owner1' });
      const chat = makeChat({
        type: ChatType.PROJECT,
        projectId: 'p1',
        participants: [{ userId: 'member1', role: ParticipantRole.MEMBER, joinedAt: new Date() }],
      });
      expect(canAddParticipant('member1', chat, 'owner1', project)).toBe(true);
    });

    it('allows for PROJECT when target is project member', () => {
      const project = makeProject({ owner: 'owner1' });
      const chat = makeChat({
        type: ChatType.PROJECT,
        projectId: 'p1',
        participants: [{ userId: 'member1', role: ParticipantRole.MEMBER, joinedAt: new Date() }],
      });
      expect(canAddParticipant('member1', chat, 'member2', project)).toBe(true);
    });

    it('denies if actor is not participant', () => {
      const chat = makeChat({ type: ChatType.GROUP });
      expect(canAddParticipant('outsider', chat, 'u3')).toBe(false);
    });
  });

  describe('ensureCanAddParticipant', () => {
    it('does not throw when allowed', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [{ userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      expect(() => ensureCanAddParticipant('u1', chat, 'u3')).not.toThrow();
    });

    it('throws with Spanish message when denied', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(() => ensureCanAddParticipant('u1', chat, 'u3')).toThrow('No tienes permisos para agregar este participante');
    });
  });

  // Remover participante
  describe('canRemoveParticipant', () => {
    it('denies for DIRECT always', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(canRemoveParticipant('u1', chat, 'u2')).toBe(false);
    });

    it('allows for GROUP when actor is ADMIN and not removing last ADMIN', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u3', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canRemoveParticipant('u1', chat, 'u3')).toBe(true);
      expect(canRemoveParticipant('u1', chat, 'u2')).toBe(true); // hay dos admins
    });

    it('denies for GROUP when removing the last ADMIN', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canRemoveParticipant('u1', chat, 'u1')).toBe(false);
    });

    it('denies for GROUP when actor is MEMBER', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canRemoveParticipant('u2', chat, 'u1')).toBe(false);
    });

    it('denies for PROJECT when trying to remove project owner', () => {
      const project = makeProject({ owner: 'owner1' });
      const chat = makeChat({
        type: ChatType.PROJECT,
        projectId: 'p1',
        participants: [
          { userId: 'owner1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'member1', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canRemoveParticipant('member1', chat, 'owner1', project)).toBe(false);
    });

    it('allows for PROJECT when not removing owner', () => {
      const project = makeProject({ owner: 'owner1' });
      const chat = makeChat({
        type: ChatType.PROJECT,
        projectId: 'p1',
        participants: [
          { userId: 'owner1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'member1', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canRemoveParticipant('owner1', chat, 'member1', project)).toBe(true);
    });

    it('denies if actor is not participant', () => {
      const chat = makeChat({ type: ChatType.GROUP });
      expect(canRemoveParticipant('outsider', chat, 'u1')).toBe(false);
    });

    it('denies if target is not participant', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [{ userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() }],
      });
      expect(canRemoveParticipant('u1', chat, 'outsider')).toBe(false);
    });
  });

  describe('ensureCanRemoveParticipant', () => {
    it('does not throw when allowed', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.ADMIN, joinedAt: new Date() },
        ],
      });
      expect(() => ensureCanRemoveParticipant('u1', chat, 'u2')).not.toThrow();
    });

    it('throws with Spanish message when denied', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(() => ensureCanRemoveParticipant('u1', chat, 'u2')).toThrow('No tienes permisos para remover este participante');
    });
  });

  // Ver mensajes
  describe('canViewMessages', () => {
    it('returns true for participants', () => {
      const chat = makeChat();
      expect(canViewMessages('u1', chat)).toBe(true);
    });

    it('returns false for non-participants', () => {
      const chat = makeChat();
      expect(canViewMessages('outsider', chat)).toBe(false);
    });
  });

  // Abandonar chat
  describe('canLeaveChat', () => {
    it('denies for DIRECT', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(canLeaveChat('u1', chat)).toBe(false);
    });

    it('allows for GROUP when not last ADMIN', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.ADMIN, joinedAt: new Date() },
        ],
      });
      expect(canLeaveChat('u1', chat)).toBe(true);
    });

    it('denies for GROUP when last ADMIN', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canLeaveChat('u1', chat)).toBe(false);
    });

    it('allows for GROUP MEMBER', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.MEMBER, joinedAt: new Date() },
        ],
      });
      expect(canLeaveChat('u2', chat)).toBe(true);
    });

    it('allows for PROJECT participants', () => {
      const chat = makeChat({
        type: ChatType.PROJECT,
        participants: [{ userId: 'u1', role: ParticipantRole.MEMBER, joinedAt: new Date() }],
      });
      expect(canLeaveChat('u1', chat)).toBe(true);
    });

    it('denies for non-participant', () => {
      const chat = makeChat({ type: ChatType.GROUP });
      expect(canLeaveChat('outsider', chat)).toBe(false);
    });
  });

  describe('ensureCanLeaveChat', () => {
    it('does not throw when allowed', () => {
      const chat = makeChat({
        type: ChatType.GROUP,
        participants: [
          { userId: 'u1', role: ParticipantRole.ADMIN, joinedAt: new Date() },
          { userId: 'u2', role: ParticipantRole.ADMIN, joinedAt: new Date() },
        ],
      });
      expect(() => ensureCanLeaveChat('u1', chat)).not.toThrow();
    });

    it('throws with Spanish message when denied', () => {
      const chat = makeChat({ type: ChatType.DIRECT });
      expect(() => ensureCanLeaveChat('u1', chat)).toThrow('No puedes abandonar este chat');
    });
  });
});
