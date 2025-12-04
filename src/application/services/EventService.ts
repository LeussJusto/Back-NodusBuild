import { IEventRepository, CreateEventPayload, UpdateEventPayload } from '../../domain/repositories/IEventRepository';
import { EventEntity, EventStatusType, EventStatus } from '../../domain/entities/Event';
import ProjectService from './ProjectService';

export class EventService {
  constructor(private eventRepository: IEventRepository, private projectService: ProjectService) {}

  async createEvent(input: any, userId: string): Promise<EventEntity> {
    // We expect calling code to ensure membership; minimal check here
    const payload: CreateEventPayload = {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      date: input.date,
      status: input.status || EventStatus.PENDIENTE,
      createdBy: userId,
    };
    return this.eventRepository.create(payload);
  }

  async getEventById(id: string): Promise<EventEntity | null> {
    return this.eventRepository.findById(id);
  }

  async getEventsByProject(projectId: string): Promise<EventEntity[]> {
    return this.eventRepository.findByProject(projectId);
  }

  async getEventsForUser(userId: string): Promise<EventEntity[]> {
    // Get projects where user participates
    const projects = await this.projectService.getMyProjects(userId);
    const projectIds = projects.map((p) => p.id);
    if (!projectIds || projectIds.length === 0) return [];
    return this.eventRepository.findByProjects(projectIds);
  }

  async markDueEventsAsRealized(upToDate?: Date): Promise<number> {
    const date = upToDate || new Date();
    return this.eventRepository.markEventsAsRealizedUpTo(date);
  }

  async updateEvent(id: string, input: any, userId: string): Promise<EventEntity> {
    const existing = await this.eventRepository.findById(id);
    if (!existing) throw new Error('Evento no encontrado');
    // only creator (residente) can edit
    if (existing.createdBy !== userId) throw new Error('No tienes permiso para modificar este evento');
    const payload: UpdateEventPayload = {
      title: input.title,
      description: input.description,
      date: input.date,
      status: input.status,
    };
    const updated = await this.eventRepository.update(id, payload);
    if (!updated) throw new Error('No se pudo actualizar el evento');
    return updated;
  }

  async deleteEvent(id: string, userId: string): Promise<boolean> {
    const existing = await this.eventRepository.findById(id);
    if (!existing) throw new Error('Evento no encontrado');
    if (existing.createdBy !== userId) throw new Error('No tienes permiso para eliminar este evento');
    return this.eventRepository.delete(id);
  }
}

export default EventService;
