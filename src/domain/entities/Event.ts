export interface EventEntity {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  date: Date; // date+time
  status: 'pendiente' | 'realizado' | 'cancelado';
  createdBy: string; // residente (user id)
  createdAt: Date;
  updatedAt: Date;
}

export const EventStatus = {
  PENDIENTE: 'pendiente',
  REALIZADO: 'realizado',
  CANCELADO: 'cancelado',
} as const;

export type EventStatusType = typeof EventStatus[keyof typeof EventStatus];
