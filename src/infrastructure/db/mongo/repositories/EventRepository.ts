import { EventModel } from '../models/Event';
import { IEventRepository, CreateEventPayload, UpdateEventPayload } from '../../../../domain/repositories/IEventRepository';
import { EventEntity } from '../../../../domain/entities/Event';

class EventRepository implements IEventRepository {
  async create(payload: CreateEventPayload): Promise<EventEntity> {
    const created = await EventModel.create(payload as any);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<EventEntity | null> {
    const ev = await EventModel.findById(id).populate('createdBy', 'email profile').exec();
    return ev ? this.mapToEntity(ev) : null;
  }

  async findByProject(projectId: string): Promise<EventEntity[]> {
    const events = await EventModel.find({ projectId }).populate('createdBy', 'email profile').sort({ date: 1 }).exec();
    return events.map((e) => this.mapToEntity(e));
  }

  async findByProjects(projectIds: string[]): Promise<EventEntity[]> {
    if (!projectIds || projectIds.length === 0) return [];
    const events = await EventModel.find({ projectId: { $in: projectIds } })
      .populate('createdBy', 'email profile')
      .sort({ date: 1 })
      .exec();
    return events.map((e) => this.mapToEntity(e));
  }

  async markEventsAsRealizedUpTo(date: Date): Promise<number> {
    // update events with status 'pendiente' and date <= given date
    const res = await EventModel.updateMany(
      { status: 'pendiente', date: { $lte: date } },
      { $set: { status: 'realizado', updatedAt: new Date() } }
    ).exec();
    // res.modifiedCount is supported on modern mongoose; fallback to nModified
    // @ts-ignore
    return (res.modifiedCount ?? res.nModified ?? 0) as number;
  }

  async update(id: string, payload: UpdateEventPayload): Promise<EventEntity | null> {
    const updated = await EventModel.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).populate('createdBy', 'email profile').exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await EventModel.findByIdAndDelete(id).exec();
    return res !== null;
  }

  private mapToEntity(doc: any): EventEntity {
    return {
      id: doc._id.toString(),
      projectId: doc.projectId?._id?.toString() || doc.projectId?.toString(),
      title: doc.title,
      description: doc.description,
      date: doc.date,
      status: doc.status,
      createdBy: doc.createdBy?._id?.toString() || doc.createdBy?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new EventRepository();
