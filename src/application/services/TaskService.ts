import { 
  ITaskRepository, 
  CreateTaskPayload, 
  UpdateTaskPayload 
} from '../../domain/repositories/ITaskRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { Task, TaskStatus, TaskPriority } from '../../domain/entities/Task';
import * as TaskDomainService from '../../domain/services/TaskDomainService';
import { CreateTaskInput, UpdateTaskInput } from '../dto/taskDTO';
import { NotificationService } from './NotificationService';
import { DEFAULT_TASK_STATUS, DEFAULT_TASK_PRIORITY } from '../../shared/constants/task';

export class TaskService {
  constructor(
    private taskRepository: ITaskRepository,
    private projectRepository: IProjectRepository,
    private notificationService: NotificationService
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
      attachments: input.attachments || [],
      comments: input.comments || [],
      ppcWeek: input.ppcWeek,
    };

    const task = await this.taskRepository.create(payload);

    // Notificar asignación si corresponde
    if (task.assignedTo) {
      await this.notificationService.notifyTaskAssigned(task.assignedTo, userId, '', {
        projectId: project.id,
        taskId: task.id,
        taskTitle: task.title,
      });
    }

    return task;
  }

  async addComment(taskId: string, text: string, userId: string): Promise<Task> {
    // verify membership and existence
    const task = await this.getTaskById(taskId, userId);
    if (!task) throw new Error('Tarea no encontrada');
    return this.taskRepository.addComment(taskId, userId, text) as Promise<Task>;
  }

  async editComment(taskId: string, commentId: string, text: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error('Tarea no encontrada');
    const comment = task.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comentario no encontrado');
    // permisos: solo el autor del comentario o el creador de la tarea pueden editar
    if (comment.commenter !== userId && task.createdBy !== userId) {
      throw new Error('No tienes permiso para editar este comentario');
    }
    const updated = await this.taskRepository.editComment(taskId, commentId, text);
    if (!updated) throw new Error('No se pudo editar el comentario');
    return updated;
  }

  async deleteComment(taskId: string, commentId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error('Tarea no encontrada');
    const comment = task.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comentario no encontrado');
    // permisos: solo el autor del comentario o el creador de la tarea pueden eliminar
    if (comment.commenter !== userId && task.createdBy !== userId) {
      throw new Error('No tienes permiso para eliminar este comentario');
    }
    const updated = await this.taskRepository.deleteComment(taskId, commentId);
    if (!updated) throw new Error('No se pudo eliminar el comentario');
    return updated;
  }

  async addAttachment(taskId: string, url: string, userId: string): Promise<Task> {
    // verify membership
    const task = await this.getTaskById(taskId, userId);
    if (!task) throw new Error('Tarea no encontrada');
    return this.taskRepository.addAttachment(taskId, url) as Promise<Task>;
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

  // Obtener todas las tareas de todos los proyectos en los que el usuario es miembro
  async getAllTasks(userId: string): Promise<Task[]> {
    // Obtener proyectos donde el usuario es miembro
    const projects = await this.projectRepository.findByUser(userId);
    if (!projects || projects.length === 0) return [];

    // Recopilar tareas de cada proyecto
    const tasksArr: Task[] = [];
    for (const p of projects) {
      const projectTasks = await this.taskRepository.findByProject(p.id);
      if (projectTasks && projectTasks.length) tasksArr.push(...projectTasks);
    }

    // Opcional: ordenar por fecha de creación desc
    tasksArr.sort((a, b) => (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0));

    return tasksArr;
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

    // Antes de aplicar el $set general, no permitimos crear comentarios desde updateTask
    const payload: UpdateTaskPayload = { ...input } as any;

    if (payload.comments && Array.isArray(payload.comments) && payload.comments.length > 0) {
      throw new Error('Para crear comentarios usa la mutation addTaskComment; updateTask no permite modificar el array de comentarios');
    }

    const updatedTask = await this.taskRepository.update(taskId, payload);
    if (!updatedTask) {
      throw new Error('Error al actualizar la tarea');
    }
    // Notificar re-asignación si cambió el asignatario
    if (input.assignedTo && input.assignedTo !== task.assignedTo && updatedTask.assignedTo) {
      await this.notificationService.notifyTaskAssigned(updatedTask.assignedTo, userId, '', {
        projectId: project.id,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
      });
    }

    // Notificar cambio de estado
    if (input.status && input.status !== task.status && updatedTask.assignedTo) {
      await this.notificationService.notifyTaskStatusChanged(updatedTask.assignedTo, userId, '', {
        projectId: project.id,
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        status: input.status,
      });
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
