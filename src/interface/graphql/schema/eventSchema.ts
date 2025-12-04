import gql from 'graphql-tag';
import eventResolver from '../resolvers/eventResolver';

const typeDefs = gql`
  enum EventStatus {
    pendiente
    realizado
    cancelado
  }

  type Event {
    id: ID!
    project: Project!
    title: String!
    description: String
    date: String!
    status: EventStatus!
    createdBy: User!
    createdAt: String
    updatedAt: String
  }

  input CreateEventInput {
    projectId: ID!
    title: String!
    description: String
    date: String! # ISO
    status: EventStatus
  }

  input UpdateEventInput {
    title: String
    description: String
    date: String
    status: EventStatus
  }

  extend type Query {
    event(id: ID!): Event
    eventsByProject(projectId: ID!): [Event!]!
    eventsForUser: [Event!]!
  }

  extend type Mutation {
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!
  }
`;

export default { typeDefs, resolvers: eventResolver };
