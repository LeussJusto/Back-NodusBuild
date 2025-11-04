import { 
  ITaskRepository, 
  CreateTaskPayload, 
  UpdateTaskPayload 
} from '../../domain/repositories/ITaskRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { Task, TaskStatus, TaskPriority } from '../../domain/entities/Task';
import * as TaskDomainService from '../../domain/services/TaskDomainService';
import { CreateTaskInput, UpdateTaskInput } from '../dto/taskDTO';
import { DEFAULT_TASK_STATUS, DEFAULT_TASK_PRIORITY } from '../../shared/constants/task';

export class TaskService {
  constructor(
    private taskRepository: ITaskRepository,
    private projectRepository: IProjectRepository
  ) {}

  async createTask(input: CreateTaskInput, userId: string): Promise<Task> {
    const project = await this.projectRepository.findById(input.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    if (!TaskDomainService.canCreateTask(userId, project)) {
      throw new Error('Debes ser miembro del proyecto para crear tareas');
    }

    TaskDomainService.ensureAssignedToIsProjectMember(input.assignedTo, project);

    const payload: CreateTaskPayload = {
      project: input.project,
      title: input.title,
      description: input.description,
      assignedTo: input.assignedTo,
      createdBy: userId,
      plannedDate: input.plannedDate,
      status: input.status || (DEFAULT_TASK_STATUS as TaskStatus),
      priority: input.priority || (DEFAULT_TASK_PRIORITY as TaskPriority),
      checklist: input.checklist || [],
      dependencies: input.dependencies || [],
      ppcWeek: input.ppcWeek,
    };

    return this.taskRepository.create(payload);
  }

  async getTaskById(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    const project = await this.projectRepository.findById(task.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (!TaskDomainService.isProjectMember(userId, project)) {
      throw new Error('Debes ser miembro del proyecto para ver esta tarea');
    }

    return task;
  }

  async getTasksByProject(projectId: string, userId: string): Promise<Task[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (!TaskDomainService.isProjectMember(userId, project)) {
      throw new Error('Debes ser miembro del proyecto para ver las tareas');
    }

    return this.taskRepository.findByProject(projectId);
  }

  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    userId: string
  ): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }
    const project = await this.projectRepository.findById(task.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    if (
      !TaskDomainService.canUpdateTask(
        userId,
        project,
        task.createdBy,
        task.assignedTo
      )
    ) {
      throw new Error('No tienes permiso para actualizar esta tarea');
    }
    if (input.assignedTo) {
      TaskDomainService.ensureAssignedToIsProjectMember(input.assignedTo, project);
    }

    const payload: UpdateTaskPayload = { ...input };
    const updatedTask = await this.taskRepository.update(taskId, payload);
    if (!updatedTask) {
      throw new Error('Error al actualizar la tarea');
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }
    const project = await this.projectRepository.findById(task.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    if (!TaskDomainService.canDeleteTask(userId, project, task.createdBy)) {
      throw new Error('No tienes permiso para eliminar esta tarea');
    }

    return this.taskRepository.delete(taskId);
  }
}
