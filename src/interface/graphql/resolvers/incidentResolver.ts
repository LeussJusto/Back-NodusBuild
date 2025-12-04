import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { CreateIncidentInput, UpdateIncidentInput } from '../../../application/dto/incidentDTO';
import { IncidentGQL, CreateIncidentInputGQL, UpdateIncidentInputGQL } from '../types/incidentTypes';

const incidentResolver = {
  Incident: {
    project: async (parent: any) => {
      try {
        const ProjectRepository = (await import('../../../infrastructure/db/mongo/repositories/ProjectRepository')).default;
        if (!parent.projectId && !parent.project) return null;
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
        console.warn('[IncidentResolver] project field resolver error:', err);
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
        console.warn('[IncidentResolver] assignedTo resolver error:', err);
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
        console.warn('[IncidentResolver] createdBy resolver error:', err);
        return null;
      }
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
    incident: async (_: any, { id }: { id: string }, ctx: any): Promise<IncidentGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { incidentService } = ctx;
      return (await incidentService.getIncidentById(id, userId)) as any;
    },

    incidentsByProject: async (_: any, { projectId }: { projectId: string }, ctx: any): Promise<IncidentGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { incidentService } = ctx;
      return (await incidentService.getIncidentsByProject(projectId, userId)) as any;
    },

    incidentsForUser: async (_: any, __: any, ctx: any): Promise<IncidentGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { incidentService } = ctx;
      return (await incidentService.getIncidentsForUser(userId)) as any;
    },
  },

  Mutation: {
    createIncident: async (_: any, { input }: { input: CreateIncidentInputGQL }, ctx: any): Promise<IncidentGQL> => {
      const { userId } = requireAuth(ctx);
      const { incidentService, documentService } = ctx;

      const CreateSchema = z.object({
        projectId: z.string().min(1),
        taskId: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.string().optional(),
        priority: z.string().optional(),
        evidenceFiles: z.array(z.any()).optional(),
      });

      const parsed = CreateSchema.parse(input);

      const evidenceUrls: string[] = [];
      // if files provided, upload them via documentService
      if (parsed.evidenceFiles && Array.isArray(parsed.evidenceFiles)) {
        const uploads = parsed.evidenceFiles as any[];
        const store = async (upload: any) => {
          const resolved = await upload;
          // Some upload middlewares wrap the file under a `file` property
          const fileObj = resolved && resolved.file ? resolved.file : resolved;
          const { createReadStream, filename, mimetype } = fileObj || {};
          if (typeof createReadStream !== 'function') {
            throw new Error('Invalid upload object: createReadStream is not a function');
          }
          const stream = createReadStream();
          const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${filename.replace(/\s+/g, '_')}`;
          const outDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const outPath = path.join(outDir, uniqueName);
          await promisify(pipeline)(stream, fs.createWriteStream(outPath));
          return `/uploads/${uniqueName}`;
        };

        const results = await Promise.all(uploads.map((u) => store(u)));
        evidenceUrls.push(...results);
      }

      const payload: CreateIncidentInput = {
        projectId: parsed.projectId,
        taskId: parsed.taskId,
        title: parsed.title,
        description: parsed.description,
        type: parsed.type,
        priority: parsed.priority,
        evidence: evidenceUrls,
      };

      return (await incidentService.createIncident(payload, userId)) as any;
    },

    updateIncident: async (_: any, { id, input }: { id: string; input: UpdateIncidentInputGQL }, ctx: any): Promise<IncidentGQL> => {
      const { userId } = requireAuth(ctx);
      const { incidentService } = ctx;
      const UpdateSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional(),
        assignedTo: z.string().optional(),
        evidence: z.array(z.string()).optional(),
      });
      const parsed = UpdateSchema.parse(input);
      const payload: UpdateIncidentInput = { ...parsed };
      return (await incidentService.updateIncident(id, payload, userId)) as any;
    },

    deleteIncident: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { incidentService } = ctx;
      return incidentService.deleteIncident(id, userId);
    },
  },
};

export default incidentResolver;
