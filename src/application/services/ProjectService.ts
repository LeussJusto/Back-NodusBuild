import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ProjectEntity, ProjectRole } from '../../domain/entities/Project';
import { canAccess, ensureNotRemovingOwner, ensureOwnerCanModify } from '../../domain/services/ProjectDomainService';
import { CreateProjectDTO, UpdateProjectDTO, AddTeamMemberDTO } from '../dto/projectDTO';
import { DEFAULT_PERMISSIONS_BY_ROLE } from '../../shared/constants/project';
import { NotificationService } from './NotificationService';

export class ProjectService {
  private projectRepo: IProjectRepository;
  private userRepo: IUserRepository;
  private notificationService: NotificationService;

  constructor(projectRepo: IProjectRepository, userRepo: IUserRepository, notificationService: NotificationService) {
    this.projectRepo = projectRepo;
    this.userRepo = userRepo;
    this.notificationService = notificationService;
  }

  // Crear proyecto (el usuario autenticado se convierte en owner/ingeniero_residente)
  async createProject(dto: CreateProjectDTO, userId: string): Promise<ProjectEntity> {
    // ✅ Service decide los permisos iniciales del owner
    const ownerPermissions = DEFAULT_PERMISSIONS_BY_ROLE['ingeniero_residente'] || [];

    const project = await this.projectRepo.create({
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      timeline: dto.timeline,
      budget: dto.budget,
      location: dto.location,
      metadata: dto.metadata,
      owner: userId,
      team: [
        {
          user: userId,
          role: ProjectRole.INGENIERO_RESIDENTE,
          permissions: ownerPermissions,
        },
      ],
    });

    return project;
  }

  // Obtener todos los proyectos donde el usuario es owner o miembro del team
  async getMyProjects(userId: string): Promise<ProjectEntity[]> {
    const projects = await this.projectRepo.findByUser(userId);
    return projects;
  }

  // Obtener un proyecto por ID (verificando acceso)
  async getProjectById(projectId: string, userId: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Verificar que el usuario tenga acceso (owner o miembro del team)
    if (!canAccess(project, userId)) throw new Error('No tienes acceso a este proyecto');

    return project;
  }

  // Actualizar proyecto (solo el owner puede hacerlo)
  async updateProject(projectId: string, dto: UpdateProjectDTO, userId: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Solo el owner (ingeniero_residente) puede actualizar
    ensureOwnerCanModify(project, userId);

    const updated = await this.projectRepo.update(projectId, dto);
    return updated;
  }

  // Eliminar proyecto (solo el owner puede hacerlo)
  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Solo el owner puede eliminar
    ensureOwnerCanModify(project, userId);

    await this.projectRepo.delete(projectId);
    return true;
  }

  // Agregar miembro al equipo (solo el owner, puede recibir userId o email)
  async addTeamMember(projectId: string, dto: AddTeamMemberDTO, requestUserId: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Solo el owner puede agregar miembros
    ensureOwnerCanModify(project, requestUserId);

    // Si se proporciona email en lugar de userId, buscar el usuario
    let memberId = dto.userId;
    if (!memberId && dto.email) {
      const user = await this.userRepo.findByEmail(dto.email);
      if (!user) throw new Error('Usuario con ese correo no encontrado');
      memberId = user.id;
    }

    if (!memberId) throw new Error('Se requiere userId o email del usuario a agregar');

    // ✅ Service decide los permisos: usa los proporcionados o defaults por rol
    const roleKey = dto.role.toLowerCase();
    const permissions = dto.permissions || DEFAULT_PERMISSIONS_BY_ROLE[roleKey] || [];

    const updated = await this.projectRepo.addTeamMember(projectId, {
      userId: memberId,
      role: dto.role,
      permissions,
    });

    // Notificar al nuevo miembro del proyecto
    await this.notificationService.notifyProjectMemberAdded(memberId, requestUserId, '', {
      projectId: project.id,
      projectName: project.name,
      roleName: dto.role,
    });

    return updated;
  }

  // Quitar miembro del equipo (solo el owner, no puede quitar al owner)
  async removeTeamMember(projectId: string, userIdToRemove: string, requestUserId: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    // Solo el owner puede quitar miembros
    ensureOwnerCanModify(project, requestUserId);

    // No puede quitar al owner
    ensureNotRemovingOwner(project, userIdToRemove);

    const updated = await this.projectRepo.removeTeamMember(projectId, userIdToRemove);
    return updated;
  }
}

export default ProjectService;
