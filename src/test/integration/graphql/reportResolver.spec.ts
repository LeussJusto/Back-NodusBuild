import reportResolver from '../../../interface/graphql/resolvers/reportResolver';
import { ReportService } from '../../../application/services/ReportService';
import { Report, ReportType, ReportStatus } from '../../../domain/entities/Report';
import { ProjectRole } from '../../../domain/entities/Project';

// Mock del servicio
const mockReportService = {
  createDaily: jest.fn(),
  updateDaily: jest.fn(),
  deleteDaily: jest.fn(),
  createGeneral: jest.fn(),
  updateGeneral: jest.fn(),
  deleteGeneral: jest.fn(),
  submitForReview: jest.fn(),
  approveReport: jest.fn(),
  rejectReport: jest.fn(),
  getReportById: jest.fn(),
  getReportsByProject: jest.fn(),
  getMyReports: jest.fn(),
} as unknown as jest.Mocked<ReportService>;

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'r1',
    project: 'p1',
    createdBy: 'u1',
    type: ReportType.DAILY,
    date: new Date('2024-01-15'),
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

describe('Integration/reportResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.report', () => {
    it('returns report by id', async () => {
      const report = makeReport();
      mockReportService.getReportById.mockResolvedValue(report);

      const result = await reportResolver.Query.report(
        {},
        { id: 'r1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.getReportById).toHaveBeenCalledWith('r1', 'u1');
      expect(result).toEqual(report);
    });

    it('throws if not authenticated', async () => {
      await expect(
        reportResolver.Query.report(
          {},
          { id: 'r1' },
          { reportService: mockReportService } as any
        )
      ).rejects.toThrow('No autenticado');
    });

    it('throws on invalid id format', async () => {
      await expect(
        reportResolver.Query.report(
          {},
          { id: '' },
          { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Query.reportsByProject', () => {
    it('returns reports by project', async () => {
      const reports = [makeReport(), makeReport({ id: 'r2' })];
      mockReportService.getReportsByProject.mockResolvedValue(reports);

      const result = await reportResolver.Query.reportsByProject(
        {},
        { projectId: 'p1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.getReportsByProject).toHaveBeenCalledWith('p1', 'u1');
      expect(result).toEqual(reports);
    });
  });

  describe('Query.myReports', () => {
    it('returns user reports', async () => {
      const reports = [makeReport({ createdBy: 'u1' }), makeReport({ id: 'r2', createdBy: 'u1' })];
      mockReportService.getMyReports.mockResolvedValue(reports);

      const result = await reportResolver.Query.myReports(
        {},
        { projectId: 'p1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.getMyReports).toHaveBeenCalledWith('p1', 'u1');
      expect(result).toEqual(reports);
    });
  });

  describe('Mutation.createDailyReport', () => {
    it('creates daily report with valid input', async () => {
      const report = makeReport({ type: ReportType.DAILY });
      mockReportService.createDaily.mockResolvedValue(report);

      const result = await reportResolver.Mutation.createDailyReport(
        {},
        {
          input: {
            project: 'p1',
            date: '2024-01-15',
            content: 'Contenido',
            checklist: [],
            attachments: [],
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.createDaily).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'p1',
          content: 'Contenido',
        }),
        'u1'
      );
      expect(result).toEqual(report);
    });

    it('throws on invalid project id', async () => {
      await expect(
        reportResolver.Mutation.createDailyReport(
          {},
          {
            input: {
              project: '',
              content: 'Contenido',
            },
          },
          { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.createGeneralReport', () => {
    it('creates general report with valid input', async () => {
      const report = makeReport({ type: ReportType.GENERAL, relatedTasks: ['t1'] });
      mockReportService.createGeneral.mockResolvedValue(report);

      const result = await reportResolver.Mutation.createGeneralReport(
        {},
        {
          input: {
            project: 'p1',
            taskId: 't1',
            date: '2024-01-15',
            content: 'Contenido',
            checklist: [],
            attachments: [],
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.createGeneral).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'p1',
          taskId: 't1',
          content: 'Contenido',
        }),
        'u1'
      );
      expect(result).toEqual(report);
    });

    it('throws on invalid task id', async () => {
      await expect(
        reportResolver.Mutation.createGeneralReport(
          {},
          {
            input: {
              project: 'p1',
              taskId: '',
              content: 'Contenido',
            },
          },
          { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.updateReport', () => {
    it('updates daily report', async () => {
      const report = makeReport({ type: ReportType.DAILY });
      mockReportService.getReportById.mockResolvedValue(report);
      const updated = { ...report, content: 'Nuevo contenido' };
      mockReportService.updateDaily.mockResolvedValue(updated);

      const result = await reportResolver.Mutation.updateReport(
        {},
        {
          id: 'r1',
          input: {
            content: 'Nuevo contenido',
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.updateDaily).toHaveBeenCalledWith('r1', { content: 'Nuevo contenido' }, 'u1');
      expect(result).toEqual(updated);
    });

    it('updates general report', async () => {
      const report = makeReport({ type: ReportType.GENERAL });
      mockReportService.getReportById.mockResolvedValue(report);
      const updated = { ...report, content: 'Nuevo contenido' };
      mockReportService.updateGeneral.mockResolvedValue(updated);

      const result = await reportResolver.Mutation.updateReport(
        {},
        {
          id: 'r1',
          input: {
            content: 'Nuevo contenido',
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.updateGeneral).toHaveBeenCalledWith('r1', { content: 'Nuevo contenido' }, 'u1');
      expect(result).toEqual(updated);
    });
  });

  describe('Mutation.submitReportForReview', () => {
    it('submits report for review', async () => {
      const report = makeReport({ status: ReportStatus.DRAFT });
      const updated = { ...report, status: ReportStatus.IN_REVIEW };
      mockReportService.submitForReview.mockResolvedValue(updated);

      const result = await reportResolver.Mutation.submitReportForReview(
        {},
        { id: 'r1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.submitForReview).toHaveBeenCalledWith('r1', 'u1');
      expect(result).toEqual(updated);
    });
  });

  describe('Mutation.approveReport', () => {
    it('approves report with feedback', async () => {
      const report = makeReport({ status: ReportStatus.IN_REVIEW });
      const updated = { ...report, status: ReportStatus.APPROVED };
      mockReportService.approveReport.mockResolvedValue(updated);

      const result = await reportResolver.Mutation.approveReport(
        {},
        {
          input: {
            reportId: 'r1',
            feedback: 'Aprobado',
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.approveReport).toHaveBeenCalledWith('r1', { reportId: 'r1', feedback: 'Aprobado' }, 'u1');
      expect(result).toEqual(updated);
    });
  });

  describe('Mutation.rejectReport', () => {
    it('rejects report with feedback', async () => {
      const report = makeReport({ status: ReportStatus.IN_REVIEW });
      const updated = { ...report, status: ReportStatus.REJECTED };
      mockReportService.rejectReport.mockResolvedValue(updated);

      const result = await reportResolver.Mutation.rejectReport(
        {},
        {
          input: {
            reportId: 'r1',
            feedback: 'Rechazado',
          },
        },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.rejectReport).toHaveBeenCalledWith('r1', { reportId: 'r1', feedback: 'Rechazado' }, 'u1');
      expect(result).toEqual(updated);
    });
  });

  describe('Mutation.deleteReport', () => {
    it('deletes daily report', async () => {
      const report = makeReport({ type: ReportType.DAILY });
      mockReportService.getReportById.mockResolvedValue(report);
      mockReportService.deleteDaily.mockResolvedValue(true);

      const result = await reportResolver.Mutation.deleteReport(
        {},
        { id: 'r1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.deleteDaily).toHaveBeenCalledWith('r1', 'u1');
      expect(result).toBe(true);
    });

    it('deletes general report', async () => {
      const report = makeReport({ type: ReportType.GENERAL });
      mockReportService.getReportById.mockResolvedValue(report);
      mockReportService.deleteGeneral.mockResolvedValue(true);

      const result = await reportResolver.Mutation.deleteReport(
        {},
        { id: 'r1' },
        { reportService: mockReportService, user: { id: 'u1', role: ProjectRole.INGENIERO_RESIDENTE } } as any
      );

      expect(mockReportService.deleteGeneral).toHaveBeenCalledWith('r1', 'u1');
      expect(result).toBe(true);
    });
  });
});
