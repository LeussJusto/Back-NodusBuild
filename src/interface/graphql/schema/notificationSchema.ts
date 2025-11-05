import gql from 'graphql-tag';
import notificationResolver from '../resolvers/notificationResolver';

const typeDefs = gql`
  enum NotificationType {
    report_submitted
    report_approved
    report_rejected
    project_member_added
    task_assigned
    task_status_changed
    task_completed
    task_rejected
    task_delayed
    chat_message
  }

  enum RelatedEntityType {
    project
    task
    report
    document
    chat
  }

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    message: String!
    relatedEntityType: RelatedEntityType
    relatedEntityId: ID
    link: String
    read: Boolean!
    readAt: String
    actorId: ID
    actorName: String
    createdAt: String
    updatedAt: String
  }

  input NotificationFiltersInput {
    read: Boolean
    type: NotificationType
    limit: Int
    offset: Int
  }

  input MarkNotificationsAsReadInput {
    notificationIds: [ID!]!
  }

  extend type Query {
    myNotifications(filters: NotificationFiltersInput): [Notification!]!
    unreadNotificationsCount: Int!
    notification(id: ID!): Notification
  }

  extend type Mutation {
    markNotificationAsRead(id: ID!): Notification!
    markNotificationsAsRead(input: MarkNotificationsAsReadInput!): Boolean!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
  }
`;

export default {
  typeDefs,
  resolvers: notificationResolver,
};
