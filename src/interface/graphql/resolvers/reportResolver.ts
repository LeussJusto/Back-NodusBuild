import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import {
  CreateDailyInput,
  CreateGeneralInput,
  UpdateReportInput,
  ApproveReportInput,
  RejectReportInput,
} from '../../../application/dto/reportDTO';
import {
  ReportGQL,
  CreateDailyInputGQL,
  CreateGeneralInputGQL,
  UpdateReportInputGQL,
  ApproveReportInputGQL,
  RejectReportInputGQL,
} from '../types/reportTypes';

const reportResolver = {
  // Field resolvers for Report type
  Report: {
    project: async (parent: any, _args: any, ctx: any) => {
      try {
        const projectService = ctx.projectService;
        const user = ctx.user;
        const userId = user ? (user.id || (user._id as any)) : parent.createdBy;
        if (!projectService) return null;
        const proj = await projectService.getProjectById(parent.project, userId);
        return proj;
      } catch (err) {
        // If project can't be resolved, throw so the client gets a helpful error
        throw err;
      }
    },
  },
  Query: {
    // Obtener un reporte por ID
    report: async (_: any, { id }: { id: string }, ctx: any): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      
      // Validación del ID
      const ReportIdSchema = z.string().min(1, 'El ID del reporte es requerido');
      const validatedId = ReportIdSchema.parse(id);
      
      return reportService.getReportById(validatedId, userId) as ReportGQL;
    },

    // Obtener todos los reportes de un proyecto
    reportsByProject: async (
      _: any,
      { projectId }: { projectId: string },
      ctx: any
    ): Promise<ReportGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.getReportsByProject(projectId, userId)) as ReportGQL[];
    },

    // Obtener mis reportes de un proyecto
    myReports: async (
      _: any,
      { projectId }: { projectId: string },
      ctx: any
    ): Promise<ReportGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.getMyReports(projectId, userId)) as ReportGQL[];
    },
  },

  Mutation: {
    // Crear un reporte diario
    createDailyReport: async (
      _: any,
      { input }: { input: CreateDailyInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const CreateDailySchema = z.object({
        project: z.string().min(1, 'El proyecto es requerido'),
        taskId: z.string().optional(),
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
        // allow Uploads (graphQL multipart) — zod can't validate Upload shape here
        attachmentsFiles: z.any().optional(),
      });

      const parsed = CreateDailySchema.parse(input);

      // Process file uploads (if any) and persist to /uploads
      const savedAttachmentUrls: string[] = [];
      if (parsed.attachmentsFiles && Array.isArray(parsed.attachmentsFiles)) {
        const uploads = parsed.attachmentsFiles as any[];
        const store = async (upload: any) => {
          const resolved = await upload;
          // Some upload middlewares wrap the file under a `file` property
          const fileObj = resolved && resolved.file ? resolved.file : resolved;
          const { createReadStream, filename } = fileObj || {};
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
        savedAttachmentUrls.push(...results);
      }

      // Mapeo de input
      const dailyInput: CreateDailyInput = {
        ...parsed,
        date: parseDate(parsed.date),
        taskId: parsed.taskId,
        attachments: [ ...(parsed.attachments || []), ...savedAttachmentUrls ],
      };

      return (await reportService.createDaily(dailyInput, userId)) as ReportGQL;
    },

    // Crear un reporte general
    createGeneralReport: async (
      _: any,
      { input }: { input: CreateGeneralInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const CreateGeneralSchema = z.object({
        project: z.string().min(1, 'El proyecto es requerido'),
        taskId: z.string().min(1, 'La tarea es requerida'),
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
        attachmentsFiles: z.any().optional(),
      });

      const parsed = CreateGeneralSchema.parse(input);

      // Process file uploads (if any)
      const savedAttachmentUrls: string[] = [];
      if (parsed.attachmentsFiles && Array.isArray(parsed.attachmentsFiles)) {
        const uploads = parsed.attachmentsFiles as any[];
        const store = async (upload: any) => {
          const resolved = await upload;
          const fileObj = resolved && resolved.file ? resolved.file : resolved;
          const { createReadStream, filename } = fileObj || {};
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
        savedAttachmentUrls.push(...results);
      }

      // Mapeo de input
      const generalInput: CreateGeneralInput = {
        ...parsed,
        date: parseDate(parsed.date),
        attachments: [ ...(parsed.attachments || []), ...savedAttachmentUrls ],
      };

      return (await reportService.createGeneral(generalInput, userId)) as ReportGQL;
    },

    // Actualizar un reporte
    updateReport: async (
      _: any,
      { id, input }: { id: string; input: UpdateReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const UpdateReportSchema = z.object({
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
        attachmentsFiles: z.any().optional(),
      });

      const parsed = UpdateReportSchema.parse(input);

      // Process uploaded files if present
      const savedAttachmentUrls: string[] = [];
      if (parsed.attachmentsFiles && Array.isArray(parsed.attachmentsFiles)) {
        const uploads = parsed.attachmentsFiles as any[];
        const store = async (upload: any) => {
          const resolved = await upload;
          const fileObj = resolved && resolved.file ? resolved.file : resolved;
          const { createReadStream, filename } = fileObj || {};
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
        savedAttachmentUrls.push(...results);
      }

      // Mapeo de input
      const reportInput: UpdateReportInput = {
        ...parsed,
        date: parseDate(parsed.date),
        attachments: [ ...(parsed.attachments || []), ...savedAttachmentUrls ],
      };

      // Determinar si es Daily o General y llamar al método correspondiente
      const report = await reportService.getReportById(id, userId);
      
      if (report.type === 'daily') {
        return (await reportService.updateDaily(id, reportInput, userId)) as ReportGQL;
      } else {
        return (await reportService.updateGeneral(id, reportInput, userId)) as ReportGQL;
      }
    },

    // Enviar reporte a revisión
    submitReportForReview: async (
      _: any,
      { id }: { id: string },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.submitForReview(id, userId)) as ReportGQL;
    },

    // Aprobar reporte
    approveReport: async (
      _: any,
      { input }: { input: ApproveReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const ApproveReportSchema = z.object({
        reportId: z.string().min(1, 'El ID del reporte es requerido'),
        feedback: z.string().optional(),
      });

      const parsed = ApproveReportSchema.parse(input);

      const approveInput: ApproveReportInput = {
        reportId: parsed.reportId,
        feedback: parsed.feedback,
      };

      return (await reportService.approveReport(parsed.reportId, approveInput, userId)) as ReportGQL;
    },

    // Rechazar reporte
    rejectReport: async (
      _: any,
      { input }: { input: RejectReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const RejectReportSchema = z.object({
        reportId: z.string().min(1, 'El ID del reporte es requerido'),
        feedback: z.string().optional(),
      });

      const parsed = RejectReportSchema.parse(input);

      const rejectInput: RejectReportInput = {
        reportId: parsed.reportId,
        feedback: parsed.feedback,
      };

      return (await reportService.rejectReport(parsed.reportId, rejectInput, userId)) as ReportGQL;
    },

    // Eliminar reporte
    deleteReport: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      
      // Determinar si es Daily o General y llamar al método correspondiente
      const report = await reportService.getReportById(id, userId);
      
      if (report.type === 'daily') {
        return reportService.deleteDaily(id, userId);
      } else {
        return reportService.deleteGeneral(id, userId);
      }
    },
  },
};

export default reportResolver;
