import ProjectService from '../../../application/services/ProjectService';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { NotificationService } from '../../../application/services/NotificationService';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';
import { AddTeamMemberDTO, CreateProjectDTO, UpdateProjectDTO } from '../../../application/dto/projectDTO';

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'p1',
    name: 'Proyecto A',
    description: 'Desc',
    status: ProjectStatus.PLANNING,
    owner: 'owner1',
    team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: ['project_crud'] },
    ],
    ...overrides,
  } as ProjectEntity;
}

function makeRepos(overrides: Partial<IProjectRepository> = {}, userOverrides: Partial<IUserRepository> = {}) {
  const projectRepo: IProjectRepository = {
    create: jest.fn().mockResolvedValue(makeProject()),
    findById: jest.fn().mockResolvedValue(makeProject()),
    findByUser: jest.fn().mockResolvedValue([makeProject()]),
    update: jest.fn().mockResolvedValue(makeProject({ name: 'Updated' })),
    delete: jest.fn().mockResolvedValue(undefined as any),
    addTeamMember: jest.fn().mockResolvedValue(makeProject({ team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: ['project_crud'] },
      { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ] })),
    removeTeamMember: jest.fn().mockResolvedValue(makeProject({ team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: ['project_crud'] },
    ] })),
    ...overrides,
  } as unknown as IProjectRepository;

  const userRepo: IUserRepository = {
    findByEmail: jest.fn().mockResolvedValue({ id: 'u2', email: 'u2@example.com' }),
    create: jest.fn(),
    findById: jest.fn(),
    verifyCredentials: jest.fn(),
    updateAvatar: jest.fn(),
    ...userOverrides,
  } as unknown as IUserRepository;

  const notificationService: jest.Mocked<NotificationService> = {
    createNotification: jest.fn(),
    getNotificationById: jest.fn(),
    getNotificationsByUser: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    notifyReportApproved: jest.fn(),
    notifyReportRejected: jest.fn(),
    notifyProjectMemberAdded: jest.fn(),
  } as any;

  return { projectRepo, userRepo, notificationService };
}

describe('Application/ProjectService', () => {
  it('createProject sets owner and delegates to repository', async () => {
    const { projectRepo, userRepo, notificationService } = makeRepos();
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const dto: CreateProjectDTO = { name: 'P', description: 'D' } as any;
    const res = await svc.createProject(dto, 'owner1');
    expect((projectRepo.create as jest.Mock).mock.calls[0][0]).toMatchObject({
      name: 'P', description: 'D', owner: 'owner1',
    });
    expect(res.id).toBe('p1');
  });

  it('getMyProjects returns projects from repository', async () => {
    const { projectRepo, userRepo, notificationService } = makeRepos({ findByUser: jest.fn().mockResolvedValue([makeProject({ id: 'p2' })]) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const res = await svc.getMyProjects('u1');
    expect(res[0].id).toBe('p2');
    expect(projectRepo.findByUser).toHaveBeenCalledWith('u1');
  });

  it('getProjectById allows owner access', async () => {
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(makeProject({ owner: 'u1' })) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const res = await svc.getProjectById('p1', 'u1');
    expect(res.id).toBe('p1');
  });

  it('getProjectById allows team member access', async () => {
    const project = makeProject({ owner: 'owner1', team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ] });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const res = await svc.getProjectById('p1', 'u2');
    expect(res.id).toBe('p1');
  });

  it('getProjectById throws for users without access', async () => {
    const project = makeProject({ owner: 'owner1', team: [{ user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] }] });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    await expect(svc.getProjectById('p1', 'outsider')).rejects.toThrow('No tienes acceso a este proyecto');
  });

  it('updateProject only allows owner', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const dto: UpdateProjectDTO = { name: 'Updated' };
    const res = await svc.updateProject('p1', dto, 'u1');
    expect(res.name).toBe('Updated');
    await expect(svc.updateProject('p1', dto, 'u2')).rejects.toThrow('Solo el creador del proyecto puede realizar esta acción');
  });

  it('deleteProject only allows owner', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    await expect(svc.deleteProject('p1', 'u1')).resolves.toBe(true);
    await expect(svc.deleteProject('p1', 'u2')).rejects.toThrow('Solo el creador del proyecto puede realizar esta acción');
  });

  it('addTeamMember allows owner with userId', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const dto: AddTeamMemberDTO = { userId: 'u2', role: 'ingeniero_calidad', permissions: [] } as any;
    const res = await svc.addTeamMember('p1', dto, 'u1');
    expect(projectRepo.addTeamMember).toHaveBeenCalledWith('p1', { userId: 'u2', role: 'ingeniero_calidad', permissions: [] });
    expect(res.team.length).toBe(2);
  });

  it('addTeamMember resolves by email', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) }, { findByEmail: jest.fn().mockResolvedValue({ id: 'u3', email: 'x@example.com' } as any) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    const dto: AddTeamMemberDTO = { email: 'x@example.com', role: 'ingeniero_calidad', permissions: [] } as any;
    await svc.addTeamMember('p1', dto, 'u1');
    expect(projectRepo.addTeamMember).toHaveBeenCalledWith('p1', { userId: 'u3', role: 'ingeniero_calidad', permissions: [] });
  });

  it('addTeamMember throws when not owner', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    await expect(
      svc.addTeamMember('p1', { userId: 'u2', role: 'ingeniero_calidad', permissions: [] } as any, 'uX')
    ).rejects.toThrow('Solo el creador del proyecto puede realizar esta acción');
  });

  it('addTeamMember throws when neither userId nor email provided', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    await expect(
      svc.addTeamMember('p1', { role: 'ingeniero_calidad', permissions: [] } as any, 'u1')
    ).rejects.toThrow('Se requiere userId o email del usuario a agregar');
  });

  it('removeTeamMember only allows owner and cannot remove owner', async () => {
    const project = makeProject({ owner: 'u1' });
    const { projectRepo, userRepo, notificationService } = makeRepos({ findById: jest.fn().mockResolvedValue(project) });
    const svc = new ProjectService(projectRepo, userRepo, notificationService);
    await expect(svc.removeTeamMember('p1', 'u2', 'uX')).rejects.toThrow('Solo el creador del proyecto puede realizar esta acción');
    await expect(svc.removeTeamMember('p1', 'u1', 'u1')).rejects.toThrow('No puedes quitar al creador del proyecto');
    await expect(svc.removeTeamMember('p1', 'u2', 'u1')).resolves.toBeTruthy();
  });
});

