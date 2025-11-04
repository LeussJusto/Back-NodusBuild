import { ReportService } from '../../../application/services/ReportService';
import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';
import { Report, ReportType, ReportStatus } from '../../../domain/entities/Report';
import { Task, TaskPriority, TaskStatus } from '../../../domain/entities/Task';

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

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'r1',
    project: 'p1',
    createdBy: 'u2',
    type: ReportType.DAILY,
    date: new Date(),
    relatedTasks: [],
    content: 'Contenido',
    checklist: [],
    status: ReportStatus.DRAFT,
    reviewers: [],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    project: 'p1',
    title: 'Tarea A',
    description: 'Desc A',
    status: TaskStatus.PENDIENTE,
    priority: TaskPriority.MEDIA,
    assignedTo: 'u2',
    createdBy: 'owner1',
    checklist: [],
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepos() {
  const reportRepo: jest.Mocked<IReportRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByProject: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const projectRepo: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
  };
  const taskRepo: jest.Mocked<ITaskRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByProject: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return { reportRepo, projectRepo, taskRepo };
}

describe('Application/ReportService', () => {
  describe('createDaily', () => {
    it('creates daily report for project member', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const created = makeReport({ type: ReportType.DAILY, createdBy: 'u2' });
      reportRepo.create.mockResolvedValue(created);

      const result = await svc.createDaily({
        project: 'p1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2');

      expect(projectRepo.findById).toHaveBeenCalledWith('p1');
      expect(reportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        project: 'p1',
        createdBy: 'u2',
        type: ReportType.DAILY,
      }));
      expect(result).toEqual(created);
    });

    it('throws if project not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      projectRepo.findById.mockResolvedValue(null);

      await expect(svc.createDaily({
        project: 'p1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2')).rejects.toThrow('Proyecto no encontrado');
    });

    it('throws if user is not project member', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);

      await expect(svc.createDaily({
        project: 'p1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'uX')).rejects.toThrow('Debes ser miembro del proyecto para crear reportes diarios');
    });
  });

  describe('updateDaily', () => {
    it('updates daily report in draft', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      reportRepo.findById.mockResolvedValue(report);
      const updated = { ...report, content: 'Nuevo contenido' };
      reportRepo.update.mockResolvedValue(updated);

      const result = await svc.updateDaily('r1', {
        content: 'Nuevo contenido',
      }, 'u2');

      expect(reportRepo.findById).toHaveBeenCalledWith('r1');
      expect(reportRepo.update).toHaveBeenCalledWith('r1', expect.objectContaining({
        content: 'Nuevo contenido',
      }));
      expect(result).toEqual(updated);
    });

    it('throws if report not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      reportRepo.findById.mockResolvedValue(null);

      await expect(svc.updateDaily('r1', { content: 'X' }, 'u2')).rejects.toThrow('Reporte no encontrado');
    });

    it('throws if user cannot update daily', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.IN_REVIEW });
      reportRepo.findById.mockResolvedValue(report);

      await expect(svc.updateDaily('r1', { content: 'X' }, 'u2')).rejects.toThrow('No tienes permiso para actualizar este reporte diario');
    });
  });

  describe('deleteDaily', () => {
    it('deletes daily report in draft', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      reportRepo.findById.mockResolvedValue(report);
      reportRepo.delete.mockResolvedValue(true);

      await svc.deleteDaily('r1', 'u2');

      expect(reportRepo.findById).toHaveBeenCalledWith('r1');
      expect(reportRepo.delete).toHaveBeenCalledWith('r1');
    });

    it('throws if report not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      reportRepo.findById.mockResolvedValue(null);

      await expect(svc.deleteDaily('r1', 'u2')).rejects.toThrow('Reporte no encontrado');
    });

    it('throws if user cannot delete daily', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.APPROVED });
      reportRepo.findById.mockResolvedValue(report);

      await expect(svc.deleteDaily('r1', 'u2')).rejects.toThrow('No tienes permiso para eliminar este reporte diario');
    });
  });

  describe('createGeneral', () => {
    it('creates general report for task assignee', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const task = makeTask({ assignedTo: 'u2', project: 'p1' });
      taskRepo.findById.mockResolvedValue(task);
      const created = makeReport({ type: ReportType.GENERAL, createdBy: 'u2' });
      reportRepo.create.mockResolvedValue(created);

      const result = await svc.createGeneral({
        project: 'p1',
        taskId: 't1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2');

      expect(projectRepo.findById).toHaveBeenCalledWith('p1');
      expect(taskRepo.findById).toHaveBeenCalledWith('t1');
      expect(reportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        project: 'p1',
        createdBy: 'u2',
        type: ReportType.GENERAL,
      }));
      expect(result).toEqual(created);
    });

    it('throws if related task not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      taskRepo.findById.mockResolvedValue(null);

      await expect(svc.createGeneral({
        project: 'p1',
        taskId: 't1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2')).rejects.toThrow('Tarea no encontrada');
    });

    it('throws if user is not task assignee', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const task = makeTask({ assignedTo: 'u3', project: 'p1' });
      taskRepo.findById.mockResolvedValue(task);

      await expect(svc.createGeneral({
        project: 'p1',
        taskId: 't1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2')).rejects.toThrow('Solo el asignatario de la tarea puede crear el reporte general');
    });

    it('throws if task does not belong to project', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const task = makeTask({ assignedTo: 'u2', project: 'p2' });
      taskRepo.findById.mockResolvedValue(task);

      await expect(svc.createGeneral({
        project: 'p1',
        taskId: 't1',
        date: new Date(),
        content: 'Contenido',
        checklist: [],
        attachments: [],
      }, 'u2')).rejects.toThrow('La tarea no pertenece al proyecto');
    });
  });

  describe('updateGeneral', () => {
    it('updates general report in draft', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      reportRepo.findById.mockResolvedValue(report);
      const updated = { ...report, content: 'Nuevo contenido' };
      reportRepo.update.mockResolvedValue(updated);

      const result = await svc.updateGeneral('r1', {
        content: 'Nuevo contenido',
      }, 'u2');

      expect(reportRepo.findById).toHaveBeenCalledWith('r1');
      expect(reportRepo.update).toHaveBeenCalledWith('r1', expect.objectContaining({
        content: 'Nuevo contenido',
      }));
      expect(result).toEqual(updated);
    });

    it('throws if report not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      reportRepo.findById.mockResolvedValue(null);

      await expect(svc.updateGeneral('r1', { content: 'X' }, 'u2')).rejects.toThrow('Reporte no encontrado');
    });

    it('throws if user cannot update general', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.REJECTED });
      reportRepo.findById.mockResolvedValue(report);

      await expect(svc.updateGeneral('r1', { content: 'X' }, 'u2')).rejects.toThrow('No tienes permiso para actualizar este reporte general');
    });
  });

  describe('deleteGeneral', () => {
    it('deletes general report in draft', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      reportRepo.findById.mockResolvedValue(report);
      reportRepo.delete.mockResolvedValue(true);

      await svc.deleteGeneral('r1', 'u2');

      expect(reportRepo.findById).toHaveBeenCalledWith('r1');
      expect(reportRepo.delete).toHaveBeenCalledWith('r1');
    });

    it('throws if report not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      reportRepo.findById.mockResolvedValue(null);

      await expect(svc.deleteGeneral('r1', 'u2')).rejects.toThrow('Reporte no encontrado');
    });

    it('throws if user cannot delete general', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.REJECTED });
      reportRepo.findById.mockResolvedValue(report);

      await expect(svc.deleteGeneral('r1', 'u2')).rejects.toThrow('No tienes permiso para eliminar este reporte general');
    });
  });

  describe('submitForReview', () => {
    it('submits report for review', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ createdBy: 'u2', status: ReportStatus.DRAFT });
      reportRepo.findById.mockResolvedValue(report);
      const updated = { ...report, status: ReportStatus.IN_REVIEW };
      reportRepo.update.mockResolvedValue(updated);

      const result = await svc.submitForReview('r1', 'u2');

      expect(reportRepo.update).toHaveBeenCalledWith('r1', expect.objectContaining({
        status: ReportStatus.IN_REVIEW,
      }));
      expect(result).toEqual(updated);
    });

    it('throws if user cannot submit', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ createdBy: 'u2', status: ReportStatus.IN_REVIEW });
      reportRepo.findById.mockResolvedValue(report);

      await expect(svc.submitForReview('r1', 'u2')).rejects.toThrow('No tienes permiso para enviar este reporte a revisión');
    });
  });

  describe('approveReport', () => {
    it('approves report', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, status: ReportStatus.IN_REVIEW, project: 'p1' });
      reportRepo.findById.mockResolvedValue(report);
      const proj = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const updated = { ...report, status: ReportStatus.APPROVED };
      reportRepo.update.mockResolvedValue(updated);

      const result = await svc.approveReport('r1', {
        reportId: 'r1',
        feedback: 'Aprobado',
      }, 'owner1');

      expect(reportRepo.update).toHaveBeenCalledWith('r1', expect.objectContaining({
        status: ReportStatus.APPROVED,
      }));
      expect(result).toEqual(updated);
    });

    it('throws if user cannot moderate', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, status: ReportStatus.IN_REVIEW, project: 'p1' });
      reportRepo.findById.mockResolvedValue(report);
      const proj = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);

      await expect(svc.approveReport('r1', { reportId: 'r1', feedback: 'X' }, 'u2')).rejects.toThrow('Solo el residente puede aprobar reportes');
    });
  });

  describe('rejectReport', () => {
    it('rejects report', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ type: ReportType.DAILY, status: ReportStatus.IN_REVIEW, project: 'p1' });
      reportRepo.findById.mockResolvedValue(report);
      const proj = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const updated = { ...report, status: ReportStatus.REJECTED };
      reportRepo.update.mockResolvedValue(updated);

      const result = await svc.rejectReport('r1', {
        reportId: 'r1',
        feedback: 'Rechazado',
      }, 'owner1');

      expect(reportRepo.update).toHaveBeenCalledWith('r1', expect.objectContaining({
        status: ReportStatus.REJECTED,
      }));
      expect(result).toEqual(updated);
    });
  });

  describe('getReportById', () => {
    it('returns report by id', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ project: 'p1' });
      reportRepo.findById.mockResolvedValue(report);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);

      const result = await svc.getReportById('r1', 'u2');

      expect(reportRepo.findById).toHaveBeenCalledWith('r1');
      expect(result).toEqual(report);
    });

    it('throws if report not found', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      reportRepo.findById.mockResolvedValue(null);

      await expect(svc.getReportById('r1', 'u2')).rejects.toThrow('Reporte no encontrado');
    });

    it('throws if user not project member', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const report = makeReport({ project: 'p1' });
      reportRepo.findById.mockResolvedValue(report);
      const proj = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);

      await expect(svc.getReportById('r1', 'uX')).rejects.toThrow('No tienes permiso para ver este reporte');
    });
  });

  describe('getReportsByProject', () => {
    it('returns reports by project', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const reports = [makeReport(), makeReport({ id: 'r2' })];
      reportRepo.findByProject.mockResolvedValue(reports);

      const result = await svc.getReportsByProject('p1', 'u2');

      expect(projectRepo.findById).toHaveBeenCalledWith('p1');
      expect(reportRepo.findByProject).toHaveBeenCalledWith('p1');
      expect(result).toEqual(reports);
    });

    it('throws if user not project member', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);

      await expect(svc.getReportsByProject('p1', 'uX')).rejects.toThrow('Debes ser miembro del proyecto para ver reportes');
    });
  });

  describe('getMyReports', () => {
    it('returns reports by creator', async () => {
      const { reportRepo, projectRepo, taskRepo } = makeRepos();
      const svc = new ReportService(reportRepo, projectRepo, taskRepo);
      const proj = makeProject({ team: [
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      projectRepo.findById.mockResolvedValue(proj);
      const allReports = [makeReport({ createdBy: 'u2' }), makeReport({ id: 'r2', createdBy: 'u3' }), makeReport({ id: 'r3', createdBy: 'u2' })];
      reportRepo.findByProject.mockResolvedValue(allReports);

      const result = await svc.getMyReports('p1', 'u2');

      expect(projectRepo.findById).toHaveBeenCalledWith('p1');
      expect(reportRepo.findByProject).toHaveBeenCalledWith('p1');
      expect(result).toHaveLength(2);
      expect(result.every(r => r.createdBy === 'u2')).toBe(true);
    });
  });
});
