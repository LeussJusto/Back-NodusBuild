import ProjectModel from '../models/Project';
import {
  IProjectRepository,
  CreateProjectPayload,
  UpdateProjectPayload,
  AddTeamMemberPayload,
} from '../../../../domain/repositories/IProjectRepository';
import { ProjectEntity } from '../../../../domain/entities/Project';

class ProjectRepository implements IProjectRepository {
  // Crear proyecto - el payload ya debe incluir el team con owner configurado
  async create(payload: CreateProjectPayload): Promise<ProjectEntity> {
    const created = await ProjectModel.create({
      name: payload.name,
      description: payload.description,
      scope: payload.scope,
      owner: payload.owner,
      team: payload.team,
      timeline: payload.timeline,
      budget: payload.budget,
      location: payload.location,
      metadata: payload.metadata,
    });

    // Recargar el proyecto con populate para que owner y team.user sean objetos
    const project = await ProjectModel.findById(created._id)
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    if (!project) throw new Error('Error al crear el proyecto');

    // (debug logs removed)

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
    // (debug logs removed)

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

    // (debug logs removed)

    // Recargar con populate
    const updated = await ProjectModel.findById(projectId)
      .populate('owner', 'email profile')
      .populate('team.user', 'email profile')
      .exec();

    // (debug logs removed)

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
    // timeline normalization is handled below when mapping to entity
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
      // Mapear timeline a un objeto plano para evitar referencias a subdocumentos de Mongoose
      timeline: doc.timeline
        ? {
            startDate: doc.timeline.startDate ? new Date(doc.timeline.startDate) : undefined,
            endDate: doc.timeline.endDate ? new Date(doc.timeline.endDate) : undefined,
            estimatedDuration: doc.timeline.estimatedDuration,
          }
        : undefined,
      budget: doc.budget,
      location: doc.location,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new ProjectRepository();
