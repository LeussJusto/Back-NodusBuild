import { TaskStatus, TaskPriority } from '../../domain/entities/Task';

// DTO para crear o actualizar una tarea
export interface ChecklistItemInput {
  title: string;
  completed: boolean;
}

// DTO para crear una tarea 
export interface CreateTaskInput {
  project: string;
  title: string;
  description?: string;
  assignedTo?: string;
  plannedDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  checklist?: ChecklistItemInput[];
  dependencies?: string[];
  ppcWeek?: number;
}
// DTO para actualizar una tarea
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignedTo?: string;
  plannedDate?: Date;
  actualDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  checklist?: ChecklistItemInput[];
  dependencies?: string[];
  ppcWeek?: number;
}
