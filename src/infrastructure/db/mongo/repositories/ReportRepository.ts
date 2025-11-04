import {
  IReportRepository,
  CreateReportPayload,
  UpdateReportPayload,
} from '../../../../domain/repositories/IReportRepository';
import { Report } from '../../../../domain/entities/Report';
import { ReportModel } from '../models/Report';

class ReportRepository implements IReportRepository {
  async create(payload: CreateReportPayload): Promise<Report> {
    // Crea un nuevo reporte en la base de datos
    const newReport = await ReportModel.create(payload);
    return this.mapToEntity(newReport);
  }

  // Buscar reporte por ID con populate
  async findById(id: string): Promise<Report | null> {
    const report = await ReportModel.findById(id)
      .populate('project', 'name')
      .populate('createdBy', 'email profile')
      .populate('relatedTasks', 'title status')
      .populate('reviewers.user', 'email profile')
      .exec();

    return report ? this.mapToEntity(report) : null;
  }

  // Buscar todos los reportes de un proyecto con populate
  async findByProject(projectId: string): Promise<Report[]> {
    const reports = await ReportModel.find({ project: projectId })
      .populate('createdBy', 'email profile')
      .populate('relatedTasks', 'title status')
      .populate('reviewers.user', 'email profile')
      .sort({ date: -1, createdAt: -1 })
      .exec();

    return reports.map((report) => this.mapToEntity(report));
  }

  // Actualizar reporte
  async update(id: string, payload: UpdateReportPayload): Promise<Report | null> {
    const updatedReport = await ReportModel.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    )
      .populate('project', 'name')
      .populate('createdBy', 'email profile')
      .populate('relatedTasks', 'title status')
      .populate('reviewers.user', 'email profile')
      .exec();

    return updatedReport ? this.mapToEntity(updatedReport) : null;
  }

  // Eliminar reporte
  async delete(id: string): Promise<boolean> {
    const result = await ReportModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  // Mapea el documento de Mongoose a la entidad de dominio
  private mapToEntity(doc: any): Report {
    return {
      id: doc._id.toString(),
      project: doc.project?._id?.toString() || doc.project?.toString(),
      createdBy: doc.createdBy?._id?.toString() || doc.createdBy?.toString(),
      type: doc.type,
      date: doc.date,
      relatedTasks: doc.relatedTasks?.map((task: any) =>
        task?._id?.toString() || task?.toString()
      ) || [],
      content: doc.content,
      checklist: doc.checklist || [],
      status: doc.status,
      reviewers: doc.reviewers?.map((reviewer: any) => ({
        user: reviewer.user?._id?.toString() || reviewer.user?.toString(),
        approved: reviewer.approved,
        reviewedAt: reviewer.reviewedAt,
        feedback: reviewer.feedback,
      })) || [],
      attachments: doc.attachments || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new ReportRepository();
