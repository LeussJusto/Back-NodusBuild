import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../../shared/constants/task';
import { CreateTaskInput, UpdateTaskInput } from '../../../application/dto/taskDTO';
import { TaskGQL, CreateTaskInputGQL, UpdateTaskInputGQL } from '../types/taskTypes';
import { TaskStatus, TaskPriority } from '../../../domain/entities/Task';

const taskResolver = {
  Query: {
    // Obtener una tarea por ID
    task: async (_: any, { id }: { id: string }, ctx: any): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return taskService.getTaskById(id, userId) as TaskGQL;
    },

    // Obtener todas las tareas de un proyecto
    tasksByProject: async (
      _: any,
      { projectId }: { projectId: string },
      ctx: any
    ): Promise<TaskGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return (await taskService.getTasksByProject(projectId, userId)) as TaskGQL[];
    },
  },

  Mutation: {
    // Crear una nueva tarea
    createTask: async (
      _: any,
      { input }: { input: CreateTaskInputGQL },
      ctx: any
    ): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;

      // Validación con zod
      const CreateTaskSchema = z.object({
        project: z.string().min(1, 'El proyecto es requerido'),
        title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
        description: z.string().optional(),
        assignedTo: z.string().optional(),
        plannedDate: z.string().optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        checklist: z
          .array(
            z.object({
              title: z.string(),
              completed: z.boolean(),
            })
          )
          .optional(),
        dependencies: z.array(z.string()).optional(),
        ppcWeek: z.number().int().positive().optional(),
      });

      const parsed = CreateTaskSchema.parse(input);

      // Parseo y mapeo de fechas/enums
      const taskInput: CreateTaskInput = {
        ...parsed,
        plannedDate: parseDate(parsed.plannedDate),
        status: parsed.status ? (parsed.status as TaskStatus) : undefined,
        priority: parsed.priority ? (parsed.priority as TaskPriority) : undefined,
      };

      return (await taskService.createTask(taskInput, userId)) as TaskGQL;
    },

    // Actualizar una tarea
    updateTask: async (
      _: any,
      { id, input }: { id: string; input: UpdateTaskInputGQL },
      ctx: any
    ): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;

      // Validación con zod
      const UpdateTaskSchema = z.object({
        title: z.string().min(3).optional(),
        description: z.string().optional(),
        assignedTo: z.string().optional(),
        plannedDate: z.string().optional(),
        actualDate: z.string().optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        checklist: z
          .array(
            z.object({
              title: z.string(),
              completed: z.boolean(),
            })
          )
          .optional(),
        dependencies: z.array(z.string()).optional(),
        ppcWeek: z.number().int().positive().optional(),
      });

      const parsed = UpdateTaskSchema.parse(input);

      // Parseo y mapeo de fechas/enums
      const taskInput: UpdateTaskInput = {
        ...parsed,
        plannedDate: parseDate(parsed.plannedDate),
        actualDate: parseDate(parsed.actualDate),
        status: parsed.status ? (parsed.status as TaskStatus) : undefined,
        priority: parsed.priority ? (parsed.priority as TaskPriority) : undefined,
      };

      return (await taskService.updateTask(id, taskInput, userId)) as TaskGQL;
    },

    // Eliminar una tarea
    deleteTask: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return taskService.deleteTask(id, userId);
    },
  },
};

export default taskResolver;
