import {
  IReportRepository,
  CreateReportPayload,
  UpdateReportPayload,
} from '../../domain/repositories/IReportRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { ITaskRepository } from '../../domain/repositories/ITaskRepository';
import { Report, ReportStatus, ReportType } from '../../domain/entities/Report';
import * as ReportDomainService from '../../domain/services/ReportDomainService';
import {
  CreateDailyInput,
  CreateGeneralInput,
  UpdateReportInput,
  ApproveReportInput,
  RejectReportInput,
} from '../dto/reportDTO';
import { DEFAULT_REPORT_STATUS } from '../../shared/constants/report';

export class ReportService {
  constructor(
    private reportRepository: IReportRepository,
    private projectRepository: IProjectRepository,
    private taskRepository: ITaskRepository
  ) {}
  //Daily
  async createDaily(input: CreateDailyInput, userId: string): Promise<Report> {
    const project = await this.projectRepository.findById(input.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (!ReportDomainService.canCreateDaily(userId, project)) {
      throw new Error('Debes ser miembro del proyecto para crear reportes diarios');
    }

    const payload: CreateReportPayload = {
      project: input.project,
      createdBy: userId,
      type: ReportType.DAILY,
      date: input.date || new Date(),
      relatedTasks: [],
      content: input.content,
      checklist: input.checklist || [],
      status: DEFAULT_REPORT_STATUS as ReportStatus,
      reviewers: [],
      attachments: input.attachments || [],
    };

    return this.reportRepository.create(payload);
  }

  async updateDaily(reportId: string, input: UpdateReportInput, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    if (!ReportDomainService.canUpdateDaily(userId, report)) {
      throw new Error('No tienes permiso para actualizar este reporte diario');
    }

    const payload: UpdateReportPayload = { ...input };
    const updatedReport = await this.reportRepository.update(reportId, payload);
    if (!updatedReport) {
      throw new Error('Error al actualizar el reporte');
    }

    return updatedReport;
  }

  async deleteDaily(reportId: string, userId: string): Promise<boolean> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    if (!ReportDomainService.canDeleteDaily(userId, report)) {
      throw new Error('No tienes permiso para eliminar este reporte diario');
    }

    return this.reportRepository.delete(reportId);
  }

  //General

  async createGeneral(input: CreateGeneralInput, userId: string): Promise<Report> {
    const project = await this.projectRepository.findById(input.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    if (task.project !== input.project) {
      throw new Error('La tarea no pertenece al proyecto');
    }

    if (!ReportDomainService.canCreateGeneral(userId, project, task.assignedTo)) {
      throw new Error('Solo el asignatario de la tarea puede crear el reporte general');
    }

    const payload: CreateReportPayload = {
      project: input.project,
      createdBy: userId,
      type: ReportType.GENERAL,
      date: input.date || new Date(),
      relatedTasks: [input.taskId],
      content: input.content,
      checklist: input.checklist || [],
      status: DEFAULT_REPORT_STATUS as ReportStatus,
      reviewers: [],
      attachments: input.attachments || [],
    };

    return this.reportRepository.create(payload);
  }

  async updateGeneral(reportId: string, input: UpdateReportInput, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    if (!ReportDomainService.canUpdateGeneral(userId, report)) {
      throw new Error('No tienes permiso para actualizar este reporte general');
    }

    const payload: UpdateReportPayload = { ...input };
    const updatedReport = await this.reportRepository.update(reportId, payload);
    if (!updatedReport) {
      throw new Error('Error al actualizar el reporte');
    }

    return updatedReport;
  }

  async deleteGeneral(reportId: string, userId: string): Promise<boolean> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    if (!ReportDomainService.canDeleteGeneral(userId, report)) {
      throw new Error('No tienes permiso para eliminar este reporte general');
    }

    return this.reportRepository.delete(reportId);
  }

  // ========== COMPARTIDO (DAILY y GENERAL) ==========

  async submitForReview(reportId: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    if (!ReportDomainService.canSubmitForReview(userId, report)) {
      throw new Error('No tienes permiso para enviar este reporte a revisión');
    }

    ReportDomainService.validateStatusTransition(report.status, ReportStatus.IN_REVIEW);

    const payload: UpdateReportPayload = { status: ReportStatus.IN_REVIEW };
    const updatedReport = await this.reportRepository.update(reportId, payload);
    if (!updatedReport) {
      throw new Error('Error al enviar el reporte a revisión');
    }

    return updatedReport;
  }

  async approveReport(reportId: string, input: ApproveReportInput, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    const project = await this.projectRepository.findById(report.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const canModerate =
      report.type === ReportType.DAILY
        ? ReportDomainService.canModerateDaily(userId, project, report)
        : ReportDomainService.canModerateGeneral(userId, project, report);

    if (!canModerate) {
      throw new Error('Solo el residente puede aprobar reportes');
    }

    ReportDomainService.validateStatusTransition(report.status, ReportStatus.APPROVED);

    const payload: UpdateReportPayload = {
      status: ReportStatus.APPROVED,
      reviewers: [
        ...report.reviewers,
        {
          user: userId,
          approved: true,
          reviewedAt: new Date(),
          feedback: input.feedback,
        },
      ],
    };

    const updatedReport = await this.reportRepository.update(reportId, payload);
    if (!updatedReport) {
      throw new Error('Error al aprobar el reporte');
    }

    // Si es General, aquí deberíamos actualizar el estado de la tarea
    // TODO: implementar lógica de cambio de estado de tarea cuando se integre
    if (report.type === ReportType.GENERAL && report.relatedTasks.length > 0) {
      // Futuro: await this.taskRepository.update(report.relatedTasks[0], { status: 'completada' });
    }

    return updatedReport;
  }

  async rejectReport(reportId: string, input: RejectReportInput, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    const project = await this.projectRepository.findById(report.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const canModerate =
      report.type === ReportType.DAILY
        ? ReportDomainService.canModerateDaily(userId, project, report)
        : ReportDomainService.canModerateGeneral(userId, project, report);

    if (!canModerate) {
      throw new Error('Solo el residente puede rechazar reportes');
    }

    ReportDomainService.validateStatusTransition(report.status, ReportStatus.REJECTED);

    const payload: UpdateReportPayload = {
      status: ReportStatus.REJECTED,
      reviewers: [
        ...report.reviewers,
        {
          user: userId,
          approved: false,
          reviewedAt: new Date(),
          feedback: input.feedback,
        },
      ],
    };

    const updatedReport = await this.reportRepository.update(reportId, payload);
    if (!updatedReport) {
      throw new Error('Error al rechazar el reporte');
    }

    return updatedReport;
  }

  async getReportById(reportId: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    const project = await this.projectRepository.findById(report.project);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    // Validar acceso: autor, residente u owner
    const isAuthor = report.createdBy === userId;
    const isMember = ReportDomainService.isProjectMember(userId, project);

    if (!isAuthor && !isMember) {
      throw new Error('No tienes permiso para ver este reporte');
    }

    return report;
  }

  async getReportsByProject(projectId: string, userId: string): Promise<Report[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (!ReportDomainService.isProjectMember(userId, project)) {
      throw new Error('Debes ser miembro del proyecto para ver reportes');
    }

    return this.reportRepository.findByProject(projectId);
  }

  async getMyReports(projectId: string, userId: string): Promise<Report[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (!ReportDomainService.isProjectMember(userId, project)) {
      throw new Error('Debes ser miembro del proyecto');
    }

    const allReports = await this.reportRepository.findByProject(projectId);
    return allReports.filter((r) => r.createdBy === userId);
  }
}
