import { EventStatusType } from '../../domain/entities/Event';

export interface CreateEventInput {
  projectId: string;
  title: string;
  description?: string;
  date: Date;
  status?: EventStatusType;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: Date;
  status?: EventStatusType;
}
