// Chat domain entity and related types (co-located for simplicity)

export enum ChatType {
  DIRECT = 'direct',
  PROJECT = 'project',
  GROUP = 'group',
}

export enum ParticipantRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface ChatParticipant {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface ChatEntity {
  id: string;
  type: ChatType;
  projectId?: string; 
  title?: string;
  participants: ChatParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export default ChatEntity;
