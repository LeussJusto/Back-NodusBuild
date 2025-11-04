import { TaskService } from '../../../application/services/TaskService';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { Task, TaskStatus, TaskPriority } from '../../../domain/entities/Task';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';
import { CreateTaskInput, UpdateTaskInput } from '../../../application/dto/taskDTO';

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'p1',
    name: 'Proyecto A',
    status: ProjectStatus.PLANNING,
    owner: 'owner1',
    team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ],
    ...overrides,
  } as ProjectEntity;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    project: 'p1' as any,
    title: 'Tarea A',
    description: 'Descripción',
    status: TaskStatus.PENDIENTE,
    priority: TaskPriority.MEDIA,
    createdBy: 'u1',
    checklist: [],
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

function makeRepos(
  taskOverrides: Partial<ITaskRepository> = {},
  projectOverrides: Partial<IProjectRepository> = {}
) {
  const taskRepo: ITaskRepository = {
    create: jest.fn().mockResolvedValue(makeTask()),
    findById: jest.fn().mockResolvedValue(makeTask()),
    findByProject: jest.fn().mockResolvedValue([makeTask()]),
    update: jest.fn().mockResolvedValue(makeTask({ title: 'Updated' })),
    delete: jest.fn().mockResolvedValue(true),
    ...taskOverrides,
  } as unknown as ITaskRepository;

  const projectRepo: IProjectRepository = {
    findById: jest.fn().mockResolvedValue(makeProject()),
    create: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
    ...projectOverrides,
  } as unknown as IProjectRepository;

  return { taskRepo, projectRepo };
}

describe('Application/TaskService', () => {
  describe('createTask', () => {
    it('creates task and sets createdBy to current user', async () => {
      const { taskRepo, projectRepo } = makeRepos();
      const svc = new TaskService(taskRepo, projectRepo);
      const input: CreateTaskInput = {
        project: 'p1',
        title: 'Nueva tarea',
        description: 'Descripción',
      };
      const res = await svc.createTask(input, 'u2');
      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Nueva tarea',
        createdBy: 'u2',
        status: TaskStatus.PENDIENTE,
        priority: TaskPriority.MEDIA,
      }));
      expect(res.id).toBe('t1');
    });

    it('throws when user is not project member', async () => {
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos({}, { findById: jest.fn().mockResolvedValue(project) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: CreateTaskInput = {
        project: 'p1',
        title: 'Nueva tarea',
      };
      await expect(svc.createTask(input, 'uX')).rejects.toThrow('Debes ser miembro del proyecto para crear tareas');
    });

    it('throws when assignedTo is not project member', async () => {
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos({}, { findById: jest.fn().mockResolvedValue(project) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: CreateTaskInput = {
        project: 'p1',
        title: 'Nueva tarea',
        assignedTo: 'uX',
      };
      await expect(svc.createTask(input, 'u2')).rejects.toThrow('El usuario asignado debe ser miembro del proyecto');
    });

    it('allows assigning to valid project member', async () => {
      const { taskRepo, projectRepo } = makeRepos();
      const svc = new TaskService(taskRepo, projectRepo);
      const input: CreateTaskInput = {
        project: 'p1',
        title: 'Nueva tarea',
        assignedTo: 'u2',
      };
      await svc.createTask(input, 'owner1');
      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        assignedTo: 'u2',
      }));
    });
  });

  describe('getTaskById', () => {
    it('returns task when user is project member', async () => {
      const task = makeTask({ project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const res = await svc.getTaskById('t1', 'u2');
      expect(res.id).toBe('t1');
      expect(projectRepo.findById).toHaveBeenCalledWith('p1');
    });

    it('throws when task not found', async () => {
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(null) });
      const svc = new TaskService(taskRepo, projectRepo);
      await expect(svc.getTaskById('tX', 'u1')).rejects.toThrow('Tarea no encontrada');
    });

    it('throws when user is not project member', async () => {
      const task = makeTask({ project: 'p1' as any });
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos(
        { findById: jest.fn().mockResolvedValue(task) },
        { findById: jest.fn().mockResolvedValue(project) }
      );
      const svc = new TaskService(taskRepo, projectRepo);
      await expect(svc.getTaskById('t1', 'uX')).rejects.toThrow('Debes ser miembro del proyecto para ver esta tarea');
    });
  });

  describe('getTasksByProject', () => {
    it('returns tasks when user is project member', async () => {
      const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
      const { taskRepo, projectRepo } = makeRepos({ findByProject: jest.fn().mockResolvedValue(tasks) });
      const svc = new TaskService(taskRepo, projectRepo);
      const res = await svc.getTasksByProject('p1', 'u2');
      expect(res.length).toBe(2);
      expect(taskRepo.findByProject).toHaveBeenCalledWith('p1');
    });

    it('throws when user is not project member', async () => {
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos({}, { findById: jest.fn().mockResolvedValue(project) });
      const svc = new TaskService(taskRepo, projectRepo);
      await expect(svc.getTasksByProject('p1', 'uX')).rejects.toThrow('Debes ser miembro del proyecto para ver las tareas');
    });
  });

  describe('updateTask', () => {
    it('allows owner to update any task', async () => {
      const task = makeTask({ createdBy: 'u2', project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { title: 'Updated' };
      const res = await svc.updateTask('t1', input, 'owner1');
      expect(res.title).toBe('Updated');
    });

    it('allows ingeniero_residente to update any task', async () => {
      const task = makeTask({ createdBy: 'u1', project: 'p1' as any });
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos(
        { findById: jest.fn().mockResolvedValue(task) },
        { findById: jest.fn().mockResolvedValue(project) }
      );
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { title: 'Updated' };
      await svc.updateTask('t1', input, 'u2');
      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('allows task creator to update their task', async () => {
      const task = makeTask({ createdBy: 'u2', project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { title: 'Updated' };
      await svc.updateTask('t1', input, 'u2');
      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('allows assigned user to update task', async () => {
      const task = makeTask({ createdBy: 'u1', assignedTo: 'u2' as any, project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { title: 'Updated' };
      await svc.updateTask('t1', input, 'u2');
      expect(taskRepo.update).toHaveBeenCalled();
    });

    it('throws when user has no permission to update', async () => {
      const task = makeTask({ createdBy: 'u1', assignedTo: 'u2' as any, project: 'p1' as any });
      const project = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
        { user: 'u3', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos(
        { findById: jest.fn().mockResolvedValue(task) },
        { findById: jest.fn().mockResolvedValue(project) }
      );
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { title: 'Updated' };
      await expect(svc.updateTask('t1', input, 'u3')).rejects.toThrow('No tienes permiso para actualizar esta tarea');
    });

    it('throws when assignedTo is not project member', async () => {
      const task = makeTask({ createdBy: 'u2', project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const input: UpdateTaskInput = { assignedTo: 'uX' };
      await expect(svc.updateTask('t1', input, 'u2')).rejects.toThrow('El usuario asignado debe ser miembro del proyecto');
    });
  });

  describe('deleteTask', () => {
    it('allows owner to delete any task', async () => {
      const task = makeTask({ createdBy: 'u2', project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      const res = await svc.deleteTask('t1', 'owner1');
      expect(res).toBe(true);
      expect(taskRepo.delete).toHaveBeenCalledWith('t1');
    });

    it('allows ingeniero_residente to delete any task', async () => {
      const task = makeTask({ createdBy: 'u1', project: 'p1' as any });
      const project = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos(
        { findById: jest.fn().mockResolvedValue(task) },
        { findById: jest.fn().mockResolvedValue(project) }
      );
      const svc = new TaskService(taskRepo, projectRepo);
      await svc.deleteTask('t1', 'u2');
      expect(taskRepo.delete).toHaveBeenCalledWith('t1');
    });

    it('allows task creator to delete their task', async () => {
      const task = makeTask({ createdBy: 'u2', project: 'p1' as any });
      const { taskRepo, projectRepo } = makeRepos({ findById: jest.fn().mockResolvedValue(task) });
      const svc = new TaskService(taskRepo, projectRepo);
      await svc.deleteTask('t1', 'u2');
      expect(taskRepo.delete).toHaveBeenCalledWith('t1');
    });

    it('throws when user has no permission to delete', async () => {
      const task = makeTask({ createdBy: 'u1', project: 'p1' as any });
      const project = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
        { user: 'u3', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      const { taskRepo, projectRepo } = makeRepos(
        { findById: jest.fn().mockResolvedValue(task) },
        { findById: jest.fn().mockResolvedValue(project) }
      );
      const svc = new TaskService(taskRepo, projectRepo);
      await expect(svc.deleteTask('t1', 'u3')).rejects.toThrow('No tienes permiso para eliminar esta tarea');
    });
  });
});
