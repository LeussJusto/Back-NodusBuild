import { ProjectEntity } from '../entities/Project';
import ChatEntity, { ChatType, ParticipantRole } from '../entities/Chat';

// Helpers
export function isParticipant(chat: ChatEntity, userId: string): boolean {
  return chat.participants.some((p) => p.userId === userId);
}

export function findParticipant(chat: ChatEntity, userId: string) {
  return chat.participants.find((p) => p.userId === userId);
}

// Crear DIRECT (1-a-1)
export function canCreateDirectChat(initiatorId: string, peerId: string): boolean {
  if (!initiatorId || !peerId) return false;
  if (initiatorId === peerId) return false; 
  return true;
}

export function ensureCanCreateDirectChat(initiatorId: string, peerId: string): void {
  if (!canCreateDirectChat(initiatorId, peerId)) {
    throw new Error('No se puede crear un chat directo con los parámetros dados');
  }
}

// Crear/Acceder chat de PROYECTO
export function canCreateProjectChat(initiatorId: string, project: ProjectEntity): boolean {
  const isOwner = project.owner === initiatorId;
  const isMember = project.team.some((m) => m.user === initiatorId);
  return isOwner || isMember;
}

export function ensureCanCreateProjectChat(initiatorId: string, project: ProjectEntity): void {
  if (!canCreateProjectChat(initiatorId, project)) {
    throw new Error('Solo miembros del proyecto pueden crear o acceder al chat del proyecto');
  }
}

// Crear GROUP
export function canCreateGroupChat(initiatorId: string, initialMembers: string[]): boolean {
  if (!initiatorId) return false;
  if (!initialMembers || initialMembers.length === 0) return false;
  const unique = new Set(initialMembers);
  unique.add(initiatorId);
  return unique.size >= 2;
}

// Agregar participante
export function canAddParticipant(
  actorId: string,
  chat: ChatEntity,
  targetUserId: string,
  project?: ProjectEntity
): boolean {
  if (!isParticipant(chat, actorId)) return false;
  if (chat.type === ChatType.DIRECT) return false;

  if (chat.type === ChatType.GROUP) {
    const actor = findParticipant(chat, actorId);
    if (!actor || actor.role !== ParticipantRole.ADMIN) return false; 
  }

  if (chat.type === ChatType.PROJECT) {
    if (!project) return false;
    const isOwner = project.owner === targetUserId;
    const isMember = project.team.some((m) => m.user === targetUserId);
    if (!isOwner && !isMember) return false;
  }

  return true;
}

export function ensureCanAddParticipant(
  actorId: string,
  chat: ChatEntity,
  targetUserId: string,
  project?: ProjectEntity
): void {
  if (!canAddParticipant(actorId, chat, targetUserId, project)) {
    throw new Error('No tienes permisos para agregar este participante');
  }
}

// Remover participante
export function canRemoveParticipant(
  actorId: string,
  chat: ChatEntity,
  targetUserId: string,
  project?: ProjectEntity
): boolean {
  if (!isParticipant(chat, actorId)) return false;
  if (!isParticipant(chat, targetUserId)) return false;
  if (chat.type === ChatType.DIRECT) return false;

  if (chat.type === ChatType.GROUP) {
    const actor = findParticipant(chat, actorId);
    const target = findParticipant(chat, targetUserId);
    if (!actor || actor.role !== ParticipantRole.ADMIN) return false; // solo ADMIN remueve
    const adminCount = chat.participants.filter((p) => p.role === ParticipantRole.ADMIN).length;
    if (target && target.role === ParticipantRole.ADMIN && adminCount <= 1) return false; 
  }

  if (chat.type === ChatType.PROJECT) {
    if (project && project.owner === targetUserId) return false; 
  }

  return true;
}

export function ensureCanRemoveParticipant(
  actorId: string,
  chat: ChatEntity,
  targetUserId: string,
  project?: ProjectEntity
): void {
  if (!canRemoveParticipant(actorId, chat, targetUserId, project)) {
    throw new Error('No tienes permisos para remover este participante');
  }
}

// Ver mensajes / abandonar chat
export function canViewMessages(userId: string, chat: ChatEntity): boolean {
  return isParticipant(chat, userId);
}

export function canLeaveChat(userId: string, chat: ChatEntity): boolean {
  if (!isParticipant(chat, userId)) return false;
  if (chat.type === ChatType.DIRECT) return false;
  if (chat.type === ChatType.GROUP) {
    const me = findParticipant(chat, userId);
    if (me && me.role === ParticipantRole.ADMIN) {
      const adminCount = chat.participants.filter((p) => p.role === ParticipantRole.ADMIN).length;
      if (adminCount <= 1) return false; 
    }
  }
  return true;
}

export function ensureCanLeaveChat(userId: string, chat: ChatEntity): void {
  if (!canLeaveChat(userId, chat)) {
    throw new Error('No puedes abandonar este chat');
  }
}
