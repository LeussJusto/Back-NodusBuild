export interface NotificationGQL {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  link?: string | null;
  read: boolean;
  readAt?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface NotificationFiltersInputGQL {
  read?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface MarkNotificationsAsReadInputGQL {
  notificationIds: string[];
}
