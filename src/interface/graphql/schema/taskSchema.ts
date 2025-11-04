import gql from 'graphql-tag';
import taskResolver from '../resolvers/taskResolver';

// Definición del esquema GraphQL para tareas
const typeDefs = gql`
  enum TaskStatus {
    pendiente
    en_progreso
    revision
    completada
    no_completada
    retrasada
    cancelada
  }

  enum TaskPriority {
    baja
    media
    alta
    urgente
  }

  type ChecklistItem {
    title: String!
    completed: Boolean!
  }

  input ChecklistItemInput {
    title: String!
    completed: Boolean!
  }

  type Task {
    id: ID!
    project: Project!
    title: String!
    description: String
    assignedTo: User
    createdBy: User!
    plannedDate: String
    actualDate: String
    status: TaskStatus!
    priority: TaskPriority!
    checklist: [ChecklistItem!]!
    dependencies: [Task!]!
    ppcWeek: Int
    createdAt: String
    updatedAt: String
  }

  input CreateTaskInput {
    project: ID!
    title: String!
    description: String
    assignedTo: ID
    plannedDate: String
    status: TaskStatus
    priority: TaskPriority
    checklist: [ChecklistItemInput!]
    dependencies: [ID!]
    ppcWeek: Int
  }

  input UpdateTaskInput {
    title: String
    description: String
    assignedTo: ID
    plannedDate: String
    actualDate: String
    status: TaskStatus
    priority: TaskPriority
    checklist: [ChecklistItemInput!]
    dependencies: [ID!]
    ppcWeek: Int
  }

  extend type Query {
    task(id: ID!): Task
    tasksByProject(projectId: ID!): [Task!]!
  }

  extend type Mutation {
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }
`;

export default {
  typeDefs,
  resolvers: taskResolver,
};
