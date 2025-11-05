// Tipos TypeScript para GraphQL de Chat
export interface ChatParticipantGQL {
  userId: any; 
  role: string;
  joinedAt: string;
  lastReadAt?: string;
}

// Chat
export interface ChatGQL {
  id: string;
  type: string;
  projectId?: string;
  title?: string;
  participants: ChatParticipantGQL[];
  createdAt: string;
  updatedAt: string;
}

// Input: Crear chat directo
export interface CreateDirectChatInputGQL {
  peerId: string;
}

// Input: Crear chat de proyecto
export interface CreateProjectChatInputGQL {
  projectId: string;
}

// Input: Crear chat de grupo
export interface CreateGroupChatInputGQL {
  title: string;
  memberIds: string[];
}

// Input: Agregar participante
export interface AddChatParticipantInputGQL {
  userId: string;
}

// Input: Actualizar título
export interface UpdateChatTitleInputGQL {
  title: string;
}

// Input: Listar chats
export interface ListChatsInputGQL {
  limit?: number;
  offset?: number;
  type?: string;
}
