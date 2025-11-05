import { ChatType, ParticipantRole } from '../../domain/entities/Chat';

// DTOs para operaciones de Chat

// DTO para crear chat directo (1-a-1)
export interface CreateDirectChatDTO {
  peerId: string; // userId del otro usuario
}

// DTO para crear chat de proyecto
export interface CreateProjectChatDTO {
  projectId: string;
}

// DTO para crear chat de grupo
export interface CreateGroupChatDTO {
  title: string;
  memberIds: string[]; // userIds de los miembros iniciales (sin incluir al creador)
}

// DTO para agregar participante
export interface AddChatParticipantDTO {
  userId: string;
}

// DTO para actualizar título de grupo
export interface UpdateChatTitleDTO {
  title: string;
}

// DTO para listar chats (paginación y filtros)
export interface ListChatsDTO {
  limit?: number;
  offset?: number;
  type?: ChatType; // filtrar por tipo de chat (opcional)
}

// DTO para agregar participante con rol específico (extensión futura)
export interface AddChatParticipantWithRoleDTO {
  userId: string;
  role?: ParticipantRole; // por defecto MEMBER, pero permite especificar ADMIN
}
