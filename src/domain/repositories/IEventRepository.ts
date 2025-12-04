import { EventEntity } from '../entities/Event';

export interface CreateEventPayload {
  projectId: string;
  title: string;
  description?: string;
  date: Date;
  status?: string;
  createdBy: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  date?: Date;
  status?: string;
}

export interface IEventRepository {
  create(payload: CreateEventPayload): Promise<EventEntity>;
  findById(id: string): Promise<EventEntity | null>;
  findByProject(projectId: string): Promise<EventEntity[]>;
  findByProjects(projectIds: string[]): Promise<EventEntity[]>;
  markEventsAsRealizedUpTo(date: Date): Promise<number>;
  update(id: string, payload: UpdateEventPayload): Promise<EventEntity | null>;
  delete(id: string): Promise<boolean>;
}

export default IEventRepository;
