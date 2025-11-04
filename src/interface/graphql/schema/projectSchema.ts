import gql from 'graphql-tag';
import projectResolver from '../resolvers/projectResolver';

// Definición del esquema GraphQL para proyectos
const typeDefs = gql`
  # Enums
  enum ProjectStatus {
    planning
    active
    paused
    completed
    cancelled
  }

  enum ProjectRole {
    ingeniero_residente
    ingeniero_produccion
    ingeniero_calidad
    ingeniero_especialidades
    ingeniero_acabados
    administrador_obra
    almacenero
  }

  # Tipos

  type TeamMember {
    user: User!
    role: ProjectRole!
    permissions: [String!]!
  }

  type Scope {
    objectives: [String!]
    deliverables: [String!]
    notes: String
  }

  type Timeline {
    startDate: String
    endDate: String
    estimatedDuration: Int
  }

  type Budget {
    total: Float
    spent: Float
    currency: String
  }

  type Location {
    address: String
    coordinates: [Float!]
  }

  type Metadata {
    projectType: String
    constructionType: String
    area: Float
    floors: Int
  }

  type Project {
    id: ID!
    name: String!
    description: String
    status: ProjectStatus!
    scope: Scope
    owner: User!
    team: [TeamMember!]!
    timeline: Timeline
    budget: Budget
    location: Location
    metadata: Metadata
    createdAt: String
    updatedAt: String
  }

  # Inputs

  input ScopeInput {
    objectives: [String!]
    deliverables: [String!]
    notes: String
  }

  input TimelineInput {
    startDate: String
    endDate: String
    estimatedDuration: Int
  }

  input BudgetInput {
    total: Float
    spent: Float
    currency: String
  }

  input LocationInput {
    address: String
    coordinates: [Float!]
  }

  input MetadataInput {
    projectType: String
    constructionType: String
    area: Float
    floors: Int
  }

  input CreateProjectInput {
    name: String!
    description: String
    scope: ScopeInput
    timeline: TimelineInput
    budget: BudgetInput
    location: LocationInput
    metadata: MetadataInput
  }

  input UpdateProjectInput {
    name: String
    description: String
    status: ProjectStatus
    scope: ScopeInput
    timeline: TimelineInput
    budget: BudgetInput
    location: LocationInput
    metadata: MetadataInput
  }

  input AddTeamMemberInput {
    userId: ID
    email: String
    role: ProjectRole!
    permissions: [String!]!
  }

  # Queries
  extend type Query {
    myProjects: [Project!]!
    project(id: ID!): Project
  }

  # Mutations
  extend type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    addTeamMember(projectId: ID!, input: AddTeamMemberInput!): Project!
    removeTeamMember(projectId: ID!, userId: ID!): Project!
  }
`;

export default {
  typeDefs,
  resolvers: projectResolver,
};
