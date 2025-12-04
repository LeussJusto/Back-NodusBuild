import { IncidentModel } from '../models/Incident';
import { Incident } from '../../../../domain/entities/Incident';
import { CreateIncidentInput, UpdateIncidentInput } from '../../../../application/dto/incidentDTO';

export interface IIncidentRepository {
  create(payload: CreateIncidentInput & { createdBy: string }): Promise<Incident>;
  findById(id: string): Promise<Incident | null>;
  findByProject(projectId: string): Promise<Incident[]>;
  findByProjects(projectIds: string[]): Promise<Incident[]>;
  update(id: string, payload: UpdateIncidentInput): Promise<Incident | null>;
  delete(id: string): Promise<boolean>;
}

class IncidentRepository implements IIncidentRepository {
  async create(payload: any): Promise<Incident> {
    const created = await IncidentModel.create(payload as any);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<Incident | null> {
    const doc = await IncidentModel.findById(id).populate('createdBy', 'email profile').populate('assignedTo', 'email profile').exec();
    return doc ? this.mapToEntity(doc) : null;
  }

  async findByProject(projectId: string): Promise<Incident[]> {
    const docs = await IncidentModel.find({ projectId }).populate('createdBy', 'email profile').populate('assignedTo', 'email profile').sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.mapToEntity(d));
  }

  async findByProjects(projectIds: string[]): Promise<Incident[]> {
    if (!projectIds || projectIds.length === 0) return [];
    const docs = await IncidentModel.find({ projectId: { $in: projectIds } }).populate('createdBy', 'email profile').populate('assignedTo', 'email profile').sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.mapToEntity(d));
  }

  async update(id: string, payload: UpdateIncidentInput): Promise<Incident | null> {
    const updated = await IncidentModel.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).populate('createdBy', 'email profile').populate('assignedTo', 'email profile').exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await IncidentModel.findByIdAndDelete(id).exec();
    return res !== null;
  }

  private mapToEntity(doc: any): Incident {
    return {
      id: doc._id.toString(),
      taskId: doc.taskId?._id?.toString() || doc.taskId?.toString(),
      projectId: doc.projectId?._id?.toString() || doc.projectId?.toString(),
      title: doc.title,
      description: doc.description,
      type: doc.type,
      priority: doc.priority,
      status: doc.status,
      assignedTo: doc.assignedTo?._id?.toString() || doc.assignedTo?.toString(),
      evidence: doc.evidence || [],
      createdBy: doc.createdBy?._id?.toString() || doc.createdBy?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new IncidentRepository();
