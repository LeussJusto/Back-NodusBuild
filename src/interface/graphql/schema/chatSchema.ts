import gql from 'graphql-tag';
import chatResolver from '../resolvers/chatResolver';

// Definición del esquema GraphQL para chats
const typeDefs = gql`
  # Enums
  enum ChatType {
    direct
    project
    group
  }

  enum ParticipantRole {
    admin
    member
  }

  # Tipos

  type ChatParticipant {
    userId: User!
    role: ParticipantRole!
    joinedAt: String!
    lastReadAt: String
  }

  type Chat {
    id: ID!
    type: ChatType!
    projectId: ID
    title: String
    participants: [ChatParticipant!]!
    createdAt: String!
    updatedAt: String!
  }

  # Inputs

  input CreateDirectChatInput {
    peerId: ID!
  }

  input CreateProjectChatInput {
    projectId: ID!
  }

  input CreateGroupChatInput {
    title: String!
    memberIds: [ID!]!
  }

  input AddChatParticipantInput {
    userId: ID!
  }

  input UpdateChatTitleInput {
    title: String!
  }

  input ListChatsInput {
    limit: Int
    offset: Int
    type: ChatType
  }

  # Queries
  extend type Query {
    myChats(input: ListChatsInput): [Chat!]!
    chat(id: ID!): Chat
  }

  # Mutations
  extend type Mutation {
    createDirectChat(input: CreateDirectChatInput!): Chat!
    createProjectChat(input: CreateProjectChatInput!): Chat!
    createGroupChat(input: CreateGroupChatInput!): Chat!
    addChatParticipant(chatId: ID!, input: AddChatParticipantInput!): Chat!
    removeChatParticipant(chatId: ID!, userId: ID!): Chat!
    leaveChat(chatId: ID!): Boolean!
    updateChatTitle(chatId: ID!, input: UpdateChatTitleInput!): Chat!
  }
`;

export default {
  typeDefs,
  resolvers: chatResolver,
};
