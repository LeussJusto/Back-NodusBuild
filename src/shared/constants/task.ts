// Constantes de Task compartidas entre capas

export const TASK_STATUSES = [
  'pendiente',
  'en_progreso',
  'revision',
  'completada',
  'no_completada',
  'retrasada',
  'cancelada',
] as const;

export const TASK_PRIORITIES = [
  'baja',
  'media',
  'alta',
  'urgente',
] as const;

// Valores por defecto para nuevas tareas
export const DEFAULT_TASK_STATUS = 'pendiente' as const;
export const DEFAULT_TASK_PRIORITY = 'media' as const;

// Flujo de estados permitidos (transiciones válidas)
export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  pendiente: ['en_progreso', 'cancelada'],
  en_progreso: ['revision', 'retrasada', 'cancelada'],
  revision: ['completada', 'no_completada', 'en_progreso'],
  completada: [],
  no_completada: ['en_progreso'], 
  retrasada: ['en_progreso', 'cancelada'],
  cancelada: [], 
};
