import { z } from 'zod';
import {
  CreateProjectInputGQL,
  UpdateProjectInputGQL,
  AddTeamMemberInputGQL,
  ProjectGQL,
} from '../types/projectTypes';
import { CreateProjectDTO, UpdateProjectDTO, AddTeamMemberDTO } from '../../../application/dto/projectDTO';
import { requireAuth } from '../../../shared/utils/auth';
import { parseTimeline } from '../../../shared/utils/date';

// Convierte Date / número (ms) / string numérico a ISO string, o devuelve null
function toISOStringIfDateOrTimestamp(v: any): string | null {
  if (v === undefined || v === null) return null;

  // Date object
  if (v instanceof Date) {
    const t = v.getTime();
    if (!isNaN(t)) return v.toISOString();
    return null;
  }

  // If it's already a number (ms)
  if (typeof v === 'number' && isFinite(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
    return null;
  }

  // If it's an object (BSON/Extended JSON from Mongo, Mongoose doc wrappers, etc.)
  if (typeof v === 'object') {
    try {
      // Common Mongo extended JSON: { $date: 123456789 } or { $date: "2020-..." }
      if ('$date' in v) return toISOStringIfDateOrTimestamp((v as any).$date);
      // Some representations use $numberLong for epoch millis as string
      if ('$numberLong' in v) return toISOStringIfDateOrTimestamp((v as any).$numberLong);
      // Some drivers wrap date in { value: ... } or similar
      if ('value' in v) return toISOStringIfDateOrTimestamp((v as any).value);
      // Objects from BSON may implement toISOString or toJSON
      if (typeof (v as any).toISOString === 'function') {
        const iso = (v as any).toISOString();
        if (iso) return iso;
      }
      if (typeof (v as any).toJSON === 'function') {
        return toISOStringIfDateOrTimestamp((v as any).toJSON());
      }
      // If it has a valueOf that returns a primitive
      if (typeof (v as any).valueOf === 'function') {
        const prim = (v as any).valueOf();
        if (prim !== v) return toISOStringIfDateOrTimestamp(prim);
      }
    } catch (e) {
      // ignore and fall through
    }
  }

  // Try to coerce strings or other primitive types
  try {
    const s = String(v).trim();
    if (s === '') return null;

    // Pure numeric string -> treat as ms since epoch
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (isFinite(n)) {
        const d = new Date(n);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    // Try Date.parse on the string (handles ISO and many formats)
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();
  } catch (e) {
    // ignore and return null below
  }

  return null;
}

function normalizeProjectObject(p: any) {
  if (!p) return p;
  const copy: any = { ...p };
  if (copy.timeline) {
    copy.timeline = { ...copy.timeline };
    // preserve raw values for debugging
    const rawStart = copy.timeline.startDate;
    const rawEnd = copy.timeline.endDate;
    const isoStart = toISOStringIfDateOrTimestamp(rawStart);
    const isoEnd = toISOStringIfDateOrTimestamp(rawEnd);
    // If normalization fails we'll silently fall back to null values
    copy.timeline.startDate = isoStart;
    copy.timeline.endDate = isoEnd;
  }
  if (!copy.location) copy.location = { address: null, coordinates: null };
  copy.createdAt = toISOStringIfDateOrTimestamp(copy.createdAt) || copy.createdAt;
  copy.updatedAt = toISOStringIfDateOrTimestamp(copy.updatedAt) || copy.updatedAt;
  return copy;
}

const projectResolver = {
  // Field-level resolvers for Project type
  Project: {
    owner: async (parent: any) => {
      // parent.owner puede ser un string (userId) o un objeto poblado
      try {
        const UserRepository = (await import('../../../infrastructure/db/mongo/repositories/UserRepository')).default;
        if (!parent.owner) return null;
        if (typeof parent.owner === 'string') {
          // traer usuario por id
          return await UserRepository.findById(parent.owner);
        }
        // Si ya es un objeto poblado, devolver su forma esperada por GraphQL
        if (parent.owner.id || parent.owner._id) {
          return {
            id: parent.owner.id || (parent.owner._id && parent.owner._id.toString ? parent.owner._id.toString() : parent.owner._id),
            email: parent.owner.email,
            profile: parent.owner.profile,
          };
        }
        return parent.owner;
      } catch (err) {
        console.warn('[ProjectResolver] owner resolver error:', err);
        return null;
      }
    },
  },
  // Field-level resolvers for TeamMember sub-type
  TeamMember: {
    user: async (parent: any) => {
      try {
        const UserRepository = (await import('../../../infrastructure/db/mongo/repositories/UserRepository')).default;
        if (!parent.user) return null;
        if (typeof parent.user === 'string') {
          return await UserRepository.findById(parent.user);
        }
        if (parent.user.id || parent.user._id) {
          return {
            id: parent.user.id || (parent.user._id && parent.user._id.toString ? parent.user._id.toString() : parent.user._id),
            email: parent.user.email,
            profile: parent.user.profile,
          };
        }
        return parent.user;
      } catch (err) {
        console.warn('[ProjectResolver] team member user resolver error:', err);
        return null;
      }
    },
  },
  Query: {
    // Obtener todos los proyectos donde el usuario participa
    myProjects: async (_: any, __: any, ctx: any): Promise<ProjectGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;
      const projects = (await projectService.getMyProjects(userId)) as any[];

      // Normalizar timeline dates a ISO strings, asegurar location y normalizar created/updated
      const normalized = projects.map((p) => {
        const copy: any = { ...p };
        if (copy.timeline) {
          copy.timeline = { ...copy.timeline };
          copy.timeline.startDate = toISOStringIfDateOrTimestamp(copy.timeline.startDate);
          copy.timeline.endDate = toISOStringIfDateOrTimestamp(copy.timeline.endDate);
        }
        // Asegurar location existe y tiene address/coordinates
        if (!copy.location) {
          copy.location = { address: null, coordinates: null };
        }

        // Normalizar createdAt / updatedAt a ISO
        copy.createdAt = toISOStringIfDateOrTimestamp(copy.createdAt) || copy.createdAt;
        copy.updatedAt = toISOStringIfDateOrTimestamp(copy.updatedAt) || copy.updatedAt;

        return copy;
      });

      return normalized as ProjectGQL[];
    },

    // Obtener un proyecto por ID (verificando acceso)
    project: async (_: any, { id }: { id: string }, ctx: any): Promise<ProjectGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;
      const project = await projectService.getProjectById(id, userId);
      return (project ? normalizeProjectObject(project) : null) as ProjectGQL;
    },
  },

  Mutation: {
    // Crear nuevo proyecto (el usuario se convierte en ingeniero_residente)
    createProject: async (
      _: any,
      { input }: { input: CreateProjectInputGQL },
      ctx: any
    ): Promise<ProjectGQL> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;

      // Validación con zod
      const CreateProjectSchema = z.object({
        name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
        description: z.string().optional(),
        scope: z
          .object({
            objectives: z.array(z.string()).optional(),
            deliverables: z.array(z.string()).optional(),
            notes: z.string().optional(),
          })
          .optional(),
        timeline: z
          .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            estimatedDuration: z.number().optional(),
          })
          .optional(),
        budget: z
          .object({
            total: z.number().optional(),
            spent: z.number().optional(),
            currency: z.string().optional(),
          })
          .optional(),
        location: z
          .object({
            address: z.string().optional(),
            coordinates: z.array(z.number()).optional(),
          })
          .optional(),
        metadata: z
          .object({
            projectType: z.string().optional(),
            constructionType: z.string().optional(),
            area: z.number().optional(),
            floors: z.number().optional(),
          })
          .optional(),
      });

      const parsed = CreateProjectSchema.parse(input);
      const dto: CreateProjectDTO = {
        ...parsed,
        timeline: parseTimeline(parsed.timeline as any),
      };

      const project = await projectService.createProject(dto, userId);
      return normalizeProjectObject(project) as ProjectGQL;
    },

    // Actualizar proyecto (solo owner)
    updateProject: async (
      _: any,
      { id, input }: { id: string; input: UpdateProjectInputGQL },
      ctx: any
    ): Promise<ProjectGQL> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;

      const UpdateProjectSchema = z.object({
        name: z.string().min(3).optional(),
        description: z.string().optional(),
        status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).optional(),
        scope: z
          .object({
            objectives: z.array(z.string()).optional(),
            deliverables: z.array(z.string()).optional(),
            notes: z.string().optional(),
          })
          .optional(),
        timeline: z
          .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            estimatedDuration: z.number().optional(),
          })
          .optional(),
        budget: z
          .object({
            total: z.number().optional(),
            spent: z.number().optional(),
            currency: z.string().optional(),
          })
          .optional(),
        location: z
          .object({
            address: z.string().optional(),
            coordinates: z.array(z.number()).optional(),
          })
          .optional(),
        metadata: z
          .object({
            projectType: z.string().optional(),
            constructionType: z.string().optional(),
            area: z.number().optional(),
            floors: z.number().optional(),
          })
          .optional(),
      });

      const parsed = UpdateProjectSchema.parse(input);
      const dto: UpdateProjectDTO = {
        ...parsed,
        timeline: parseTimeline(parsed.timeline as any),
      };

      const project = await projectService.updateProject(id, dto, userId);
      return normalizeProjectObject(project) as ProjectGQL;
    },

    // Eliminar proyecto (solo owner)
    deleteProject: async (
      _: any,
      { id }: { id: string },
      ctx: any
    ): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;
      await projectService.deleteProject(id, userId);
      return true;
    },

    // Agregar miembro al equipo (solo owner, por userId o email)
    addTeamMember: async (
      _: any,
      { projectId, input }: { projectId: string; input: AddTeamMemberInputGQL },
      ctx: any
    ): Promise<ProjectGQL> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;

      const AddTeamMemberSchema = z.object({
        userId: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum([
          'ingeniero_residente',
          'ingeniero_produccion',
          'ingeniero_calidad',
          'ingeniero_especialidades',
          'ingeniero_acabados',
          'administrador_obra',
          'almacenero',
        ]),
        permissions: z.array(z.string()),
      });

      const parsed = AddTeamMemberSchema.parse(input);
      const dto: AddTeamMemberDTO = parsed;

      const project = await projectService.addTeamMember(projectId, dto, userId);
      return normalizeProjectObject(project) as ProjectGQL;
    },

    // Quitar miembro del equipo (solo owner, no puede quitar al owner)
    removeTeamMember: async (
      _: any,
      { projectId, userId }: { projectId: string; userId: string },
      ctx: any
    ): Promise<ProjectGQL> => {
      const { userId: requesterId } = requireAuth(ctx);
      const { projectService } = ctx;
      const project = await projectService.removeTeamMember(projectId, userId, requesterId);
      return normalizeProjectObject(project) as ProjectGQL;
    },
  },
};

export default projectResolver;
