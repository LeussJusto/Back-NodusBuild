import { Task, TaskStatus, TaskPriority, ChecklistItem } from '../entities/Task';

// Payload para crear una nueva tarea
export interface CreateTaskPayload {
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
}

// Payload para actualizar una tarea
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assignedTo?: string;
  plannedDate?: Date;
  actualDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  checklist?: ChecklistItem[];
  dependencies?: string[];
  ppcWeek?: number;
}

// Interfaz del repositorio de tareas - define las operaciones de persistencia
export interface ITaskRepository {
  create(payload: CreateTaskPayload): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByProject(projectId: string): Promise<Task[]>;
  update(id: string, payload: UpdateTaskPayload): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}

export default ITaskRepository;
