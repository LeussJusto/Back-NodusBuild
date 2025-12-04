import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import { CreateEventInput, UpdateEventInput } from '../../../application/dto/eventDTO';
import { EventGQL, CreateEventInputGQL, UpdateEventInputGQL } from '../types/eventTypes';

const eventResolver = {
  Event: {
    project: async (parent: any) => {
      try {
        const ProjectRepository = (await import('../../../infrastructure/db/mongo/repositories/ProjectRepository')).default;
        if (!parent.projectId && !parent.project) return null;
        // parent may have project or projectId or populated project
        if (parent.project && (parent.project.id || parent.project._id)) {
          return {
            id: parent.project.id || (parent.project._id && parent.project._id.toString ? parent.project._id.toString() : parent.project._id),
            name: parent.project.name,
          };
        }
        const id = parent.projectId || parent.project;
        if (!id) return null;
        return await ProjectRepository.findById(id);
      } catch (err) {
        console.warn('[EventResolver] project field resolver error:', err);
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
        console.warn('[EventResolver] createdBy resolver error:', err);
        return null;
      }
    },

    date: (parent: any) => {
      if (!parent.date) return null;
      const d = parent.date instanceof Date ? parent.date : new Date(parent.date);
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
  },
  Query: {
    event: async (_: any, { id }: { id: string }, ctx: any): Promise<EventGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { eventService } = ctx;
      return (await eventService.getEventById(id)) as any;
    },
    eventsByProject: async (_: any, { projectId }: { projectId: string }, ctx: any): Promise<EventGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { eventService } = ctx;
      return (await eventService.getEventsByProject(projectId)) as any;
    },
    eventsForUser: async (_: any, __: any, ctx: any): Promise<EventGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { eventService } = ctx;
      return (await eventService.getEventsForUser(userId)) as any;
    },
  },
  Mutation: {
    createEvent: async (_: any, { input }: { input: CreateEventInputGQL }, ctx: any): Promise<EventGQL> => {
      const { userId } = requireAuth(ctx);
      const CreateEventSchema = z.object({
        projectId: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.string().min(1),
        status: z.enum(['pendiente','realizado','cancelado']).optional(),
      });
      const parsed = CreateEventSchema.parse(input);
      const payload: CreateEventInput = {
        projectId: parsed.projectId,
        title: parsed.title,
        description: parsed.description,
        date: parseDate(parsed.date)!,
        status: parsed.status as any,
      };
      const { eventService } = ctx;
      return (await eventService.createEvent(payload, userId)) as any;
    },

    updateEvent: async (_: any, { id, input }: { id: string; input: UpdateEventInputGQL }, ctx: any): Promise<EventGQL> => {
      const { userId } = requireAuth(ctx);
      const UpdateEventSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        status: z.enum(['pendiente','realizado','cancelado']).optional(),
      });
      const parsed = UpdateEventSchema.parse(input);
      const payload: UpdateEventInput = {
        title: parsed.title,
        description: parsed.description,
        date: parsed.date ? parseDate(parsed.date) : undefined,
        status: parsed.status as any,
      };
      const { eventService } = ctx;
      return (await eventService.updateEvent(id, payload, userId)) as any;
    },

    deleteEvent: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { eventService } = ctx;
      return eventService.deleteEvent(id, userId);
    },
  },
};

export default eventResolver;
