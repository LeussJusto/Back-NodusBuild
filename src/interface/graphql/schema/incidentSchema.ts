import gql from 'graphql-tag';
import incidentResolver from '../resolvers/incidentResolver';

const typeDefs = gql`
  enum IncidentPriority { baja media alta urgente }
  enum IncidentStatus { open in_progress resolved closed }

  type Incident {
    id: ID!
    project: Project!
    title: String!
    description: String
    type: String
    priority: String
    status: String
    assignedTo: User
    evidence: [String!]
    createdBy: User!
    createdAt: String
    updatedAt: String
  }

  input CreateIncidentInput {
    projectId: ID!
    title: String!
    taskId: ID
    description: String
    type: String
    priority: String
    evidenceFiles: [Upload!]
  }

  input UpdateIncidentInput {
    title: String
    description: String
    type: String
    priority: String
    status: String
    assignedTo: ID
    evidence: [String!]
  }

  extend type Query {
    incident(id: ID!): Incident
    incidentsByProject(projectId: ID!): [Incident!]!
    incidentsForUser: [Incident!]!
  }

  extend type Mutation {
    createIncident(input: CreateIncidentInput!): Incident!
    updateIncident(id: ID!, input: UpdateIncidentInput!): Incident!
    deleteIncident(id: ID!): Boolean!
  }
`;

export default { typeDefs, resolvers: incidentResolver };
