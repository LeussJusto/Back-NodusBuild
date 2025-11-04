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

const projectResolver = {
  Query: {
    // Obtener todos los proyectos donde el usuario participa
    myProjects: async (_: any, __: any, ctx: any): Promise<ProjectGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;
      const projects = await projectService.getMyProjects(userId);
      return projects as ProjectGQL[];
    },

    // Obtener un proyecto por ID (verificando acceso)
    project: async (_: any, { id }: { id: string }, ctx: any): Promise<ProjectGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { projectService } = ctx;
      const project = await projectService.getProjectById(id, userId);
      return project as ProjectGQL;
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
      return project as ProjectGQL;
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
      return project as ProjectGQL;
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
      return project as ProjectGQL;
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
      return project as ProjectGQL;
    },
  },
};

export default projectResolver;
