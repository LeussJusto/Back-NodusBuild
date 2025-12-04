import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../../shared/constants/task';
import { CreateTaskInput, UpdateTaskInput } from '../../../application/dto/taskDTO';
import { TaskGQL, CreateTaskInputGQL, UpdateTaskInputGQL } from '../types/taskTypes';
import { TaskStatus, TaskPriority } from '../../../domain/entities/Task';

const taskResolver = {
  // Field-level resolvers
  Task: {
    project: async (parent: any) => {
      try {
        const ProjectRepository = (await import('../../../infrastructure/db/mongo/repositories/ProjectRepository')).default;
        if (!parent.project) return null;
        if (typeof parent.project === 'string') {
          return await ProjectRepository.findById(parent.project);
        }
        if (parent.project.id || parent.project._id) {
          return {
            id: parent.project.id || (parent.project._id && parent.project._id.toString ? parent.project._id.toString() : parent.project._id),
            name: parent.project.name,
          };
        }
        return parent.project;
      } catch (err) {
        console.warn('[TaskResolver] project field resolver error:', err);
        return null;
      }
    },

    assignedTo: async (parent: any) => {
      try {
        const UserRepository = (await import('../../../infrastructure/db/mongo/repositories/UserRepository')).default;
        if (!parent.assignedTo) return null;
        if (typeof parent.assignedTo === 'string') return await UserRepository.findById(parent.assignedTo);
        if (parent.assignedTo.id || parent.assignedTo._id) {
          return {
            id: parent.assignedTo.id || (parent.assignedTo._id && parent.assignedTo._id.toString ? parent.assignedTo._id.toString() : parent.assignedTo._id),
            email: parent.assignedTo.email,
            profile: parent.assignedTo.profile,
          };
        }
        return parent.assignedTo;
      } catch (err) {
        console.warn('[TaskResolver] assignedTo resolver error:', err);
        return null;
      }
    },

    createdBy: async (parent: any) => {
      try {
        const UserRepository = (await import('../../../infrastructure/db/mongo/repositories/UserRepository')).default;
        if (!parent.createdBy) return null;
        if (typeof parent.createdBy === 'string') return await UserRepository.findById(parent.createdBy);
        if (parent.createdBy.id || parent.createdBy._id) {
          return {
            id: parent.createdBy.id || (parent.createdBy._id && parent.createdBy._id.toString ? parent.createdBy._id.toString() : parent.createdBy._id),
            email: parent.createdBy.email,
            profile: parent.createdBy.profile,
          };
        }
        return parent.createdBy;
      } catch (err) {
        console.warn('[TaskResolver] createdBy resolver error:', err);
        return null;
      }
    },

    // Dates -> ISO
    plannedDate: (parent: any) => {
      if (!parent.plannedDate) return null;
      const d = parent.plannedDate instanceof Date ? parent.plannedDate : new Date(parent.plannedDate);
      return isNaN(d.getTime()) ? null : d.toISOString();
    },
    actualDate: (parent: any) => {
      if (!parent.actualDate) return null;
      const d = parent.actualDate instanceof Date ? parent.actualDate : new Date(parent.actualDate);
      return isNaN(d.getTime()) ? null : d.toISOString();
    },
    createdAt: (parent: any) => {
      if (!parent.createdAt) return null;
      const d = parent.createdAt instanceof Date ? parent.createdAt : new Date(parent.createdAt);
      return isNaN(d.getTime()) ? null : d.toISOString();
    },
    updatedAt: (parent: any) => {
      if (!parent.updatedAt) return null;
      const d = parent.updatedAt instanceof Date ? parent.updatedAt : new Date(parent.updatedAt);
      return isNaN(d.getTime()) ? null : d.toISOString();
    },
    // Attachments: array of file paths/URLs
    attachments: (parent: any) => {
      return parent.attachments || [];
    },

    // Comments: array of { id, commenter, text, createdAt }
    comments: async (parent: any) => {
      try {
        const UserRepository = (await import('../../../infrastructure/db/mongo/repositories/UserRepository')).default;
        const comments = parent.comments || [];
        const normalized = await Promise.all(
          comments.map(async (c: any) => {
            let commenter = null;
            if (!c) return null;
            if (typeof c.commenter === 'string') {
              commenter = await UserRepository.findById(c.commenter).catch(() => null);
            } else if (c.commenter && (c.commenter.id || c.commenter._id)) {
              commenter = {
                id: c.commenter.id || (c.commenter._id && c.commenter._id.toString ? c.commenter._id.toString() : c.commenter._id),
                email: c.commenter.email,
                profile: c.commenter.profile,
              };
            } else {
              commenter = c.commenter;
            }

            const createdAt = c.createdAt ? (c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString()) : null;

            return {
              id: c.id || (c._id && c._id.toString ? c._id.toString() : c._id),
              commenter,
              text: c.text,
              createdAt,
            };
          })
        );

        return normalized.filter((r) => r !== null);
      } catch (err) {
        console.warn('[TaskResolver] comments resolver error:', err);
        return parent.comments || [];
      }
    },
  },
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

    // Obtener todas las tareas de los proyectos del usuario
    tasks: async (_: any, __: any, ctx: any): Promise<TaskGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return (await taskService.getAllTasks(userId)) as TaskGQL[];
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
          attachments: z.array(z.string()).optional(),
          comments: z
            .array(z.object({ commenter: z.string().min(1), text: z.string().min(1) }))
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
        attachments: parsed.attachments || [],
        // Solo aceptar comentarios de creación en createTask (client no debe enviar status updates aquí)
        comments: (parsed.comments || []).filter((c: any) => c && typeof c.commenter === 'string' && typeof c.text === 'string') as { commenter: string; text: string }[],
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
        attachments: z.array(z.string()).optional(),
        comments: z
          .array(z.object({ commenter: z.string().min(1), text: z.string().min(1) }))
          .optional(),
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
        attachments: parsed.attachments || [],
        // No permitimos modificar el array de comentarios desde updateTask
        comments: (parsed.comments || []) as any,
      };

      return (await taskService.updateTask(id, taskInput, userId)) as TaskGQL;
    },

    // Eliminar una tarea
    deleteTask: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return taskService.deleteTask(id, userId);
    },
    // Agregar comentario seguro (usa userId del contexto)
    addTaskComment: async (_: any, { taskId, text }: { taskId: string; text: string }, ctx: any): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return (await taskService.addComment(taskId, text, userId)) as TaskGQL;
    },

    

    // Subir archivo asociado a una tarea y guardar URL en attachments
    uploadTaskFile: async (_: any, { taskId, file }: { taskId: string; file: any }, ctx: any): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { documentService, taskService } = ctx;

      // file is the GraphQL Upload
      const uploaded = await file;
      const { createReadStream, filename, mimetype } = uploaded;
      const stream = createReadStream();
      // buffer the stream (LocalFileStorageService supports stream, but DocumentDomain.validateDocument needs size)
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const input = {
        file: {
          buffer,
          originalName: filename,
          mimeType: mimetype,
          size: buffer.length,
        },
        relatedTo: { entityType: 'task', entityId: taskId },
      };

      const doc = await documentService.uploadDocument(input, userId);
      // asociar url a la tarea
      const updated = await taskService.addAttachment(taskId, doc.url, userId);
      if (!updated) throw new Error('No se pudo asociar el archivo a la tarea');
      return updated as TaskGQL;
    },
    // Editar texto de un comentario
    editTaskComment: async (_: any, { taskId, commentId, text }: { taskId: string; commentId: string; text: string }, ctx: any): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return (await taskService.editComment(taskId, commentId, text, userId)) as TaskGQL;
    },

    // Eliminar un comentario
    deleteTaskComment: async (_: any, { taskId, commentId }: { taskId: string; commentId: string }, ctx: any): Promise<TaskGQL> => {
      const { userId } = requireAuth(ctx);
      const { taskService } = ctx;
      return (await taskService.deleteComment(taskId, commentId, userId)) as TaskGQL;
    },
  },
};

export default taskResolver;

