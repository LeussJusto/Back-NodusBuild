import gql from 'graphql-tag';
import documentResolver from '../resolvers/documentResolver';

// Definición del esquema GraphQL para documentos
const typeDefs = gql`
  scalar Upload

  type RelatedEntity {
    entityType: String!
    entityId: ID!
  }

  type Document {
    id: ID!
    fileName: String!
    originalName: String!
    mimeType: String!
    size: Int!
    url: String!
    uploadedBy: User!
    relatedTo: RelatedEntity
    createdAt: String!
    updatedAt: String!
  }

  input UploadDocumentInput {
    file: Upload!
    entityType: String
    entityId: ID
  }

  extend type Query {
    document(id: ID!): Document
    documentsByEntity(entityType: String!, entityId: ID!): [Document!]!
  }

  extend type Mutation {
    uploadDocument(input: UploadDocumentInput!): Document!
    deleteDocument(documentId: ID!): Boolean!
  }
`;

export default {
  typeDefs,
  resolvers: documentResolver,
};
