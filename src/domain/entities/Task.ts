//Estados posibles de una tarea
export enum TaskStatus {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  REVISION = 'revision',
  COMPLETADA = 'completada',
  NO_COMPLETADA = 'no_completada',
  RETRASADA = 'retrasada',
  CANCELADA = 'cancelada',
}
//Estados de prioridad de una tarea
export enum TaskPriority {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente',
}
//Elemento de checklist dentro de una tarea
export interface ChecklistItem {
  title: string;
  completed: boolean;
}
// Comentario en una tarea
export interface TaskComment {
  id?: string;
  commenter: string; // user id
  text: string;
  createdAt: Date;
}
//Entidad Task
export interface Task {
  id: string;
  project: string; 
  title: string;
  description?: string;
  assignedTo?: string; 
  createdBy: string; 
  plannedDate?: Date;
  actualDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  checklist: ChecklistItem[];
  dependencies: string[]; 
  attachments: string[];
  comments: TaskComment[];
  ppcWeek?: number;
  createdAt: Date;
  updatedAt: Date;
}
