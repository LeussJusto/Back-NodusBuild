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
  ppcWeek?: number;
  createdAt: Date;
  updatedAt: Date;
}
