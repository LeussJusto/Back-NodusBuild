import ProjectModel from '../models/Project';
import {
  IProjectRepository,
  CreateProjectPayload,
  UpdateProjectPayload,
  AddTeamMemberPayload,
} from '../../../../domain/repositories/IProjectRepository';
import { ProjectEntity, ProjectRole } from '../../../../domain/entities/Project';
import { DEFAULT_PERMISSIONS_BY_ROLE } from '../../../../shared/constants/project';

class ProjectRepository implements IProjectRepository {
  // Crear proyecto (owner se agrega automáticamente como ingeniero_residente)
  async create(payload: CreateProjectPayload): Promise<ProjectEntity> {
    const project = await ProjectModel.create({
      name: payload.name,
      description: payload.description,
      scope: payload.scope,
      owner: payload.owner,
      team: [
        {
          user: payload.owner,
          role: ProjectRole.INGENIERO_RESIDENTE,
          permissions: DEFAULT_PERMISSIONS_BY_ROLE['ingeniero_residente'] || [],
        },
      ],
      timeline: payload.timeline,
      budget: payload.budget,
      location: payload.location,
      metadata: payload.metadata,
    });

    return this.toEntity(project);
  }

  // Buscar proyecto por ID con populate
  async findById(id: string): Promise<ProjectEntity | null> {
    const project = await ProjectModel.findById(id)
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    return project ? this.toEntity(project) : null;
  }

  // Buscar proyectos donde el usuario es owner O miembro del team
  async findByUser(userId: string): Promise<ProjectEntity[]> {
    const projects = await ProjectModel.find({
      $or: [{ owner: userId }, { 'team.user': userId }],
    })
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    return projects.map((p) => this.toEntity(p));
  }

  // Actualizar proyecto
  async update(id: string, payload: UpdateProjectPayload): Promise<ProjectEntity> {
    const project = await ProjectModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    if (!project) throw new Error('Proyecto no encontrado');
    return this.toEntity(project);
  }

  // Eliminar proyecto
  async delete(id: string): Promise<void> {
    const result = await ProjectModel.findByIdAndDelete(id);
    if (!result) throw new Error('Proyecto no encontrado');
  }

  // Agregar miembro al equipo
  async addTeamMember(projectId: string, member: AddTeamMemberPayload): Promise<ProjectEntity> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Verificar si el usuario ya está en el equipo
    if (project.team.some((tm) => tm.user.toString() === member.userId)) {
      throw new Error('Usuario ya está en el equipo');
    }

    project.team.push({
      user: member.userId as any,
      role: member.role,
      permissions: member.permissions,
    });

    await project.save();

    // Recargar con populate
    const updated = await ProjectModel.findById(projectId)
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    return this.toEntity(updated!);
  }

  // Quitar miembro del equipo
  async removeTeamMember(projectId: string, userId: string): Promise<ProjectEntity> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // No puede quitar al owner
    if (userId === project.owner.toString()) {
      throw new Error('No puedes quitar al creador del proyecto');
    }

    project.team = project.team.filter((tm) => tm.user.toString() !== userId);
    await project.save();

    // Recargar con populate
    const updated = await ProjectModel.findById(projectId)
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    return this.toEntity(updated!);
  }

  // Mapear documento Mongoose a entidad de dominio
  private toEntity(doc: any): ProjectEntity {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      status: doc.status,
      scope: doc.scope,
      owner: typeof doc.owner === 'object' ? doc.owner._id?.toString() || doc.owner : doc.owner.toString(),
      team: doc.team.map((tm: any) => ({
        user: typeof tm.user === 'object' ? tm.user._id?.toString() || tm.user : tm.user.toString(),
        role: tm.role,
        permissions: tm.permissions,
      })),
      timeline: doc.timeline,
      budget: doc.budget,
      location: doc.location,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new ProjectRepository();
