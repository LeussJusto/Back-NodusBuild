// Constantes de Chat compartidas entre capas
export const CHAT_TYPES = ['direct', 'project', 'group'] as const;

export const PARTICIPANT_ROLES = ['admin', 'member'] as const;

// Límites de paginación
export const DEFAULT_CHAT_LIST_LIMIT = 50;
export const MAX_CHAT_LIST_LIMIT = 100;

// Límites de grupo
export const MIN_GROUP_PARTICIPANTS = 2; 
export const MAX_GROUP_PARTICIPANTS = 200;

// Longitud de título de grupo
export const MIN_GROUP_TITLE_LENGTH = 1;
export const MAX_GROUP_TITLE_LENGTH = 100;
