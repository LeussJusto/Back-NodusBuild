import { gql } from 'graphql-tag';

const messageTypeDefs = gql`
  type Attachment {
    url: String!
    type: String
    filename: String
  }

  type Message {
    id: ID!
    chatId: ID!
    from: ID!
    to: ID
    text: String
    attachments: [Attachment!]
    type: String
    status: String
    createdAt: String
    updatedAt: String
  }

  type MessagePage {
    items: [Message!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  extend type Query {
    messages(chatId: ID!, limit: Int = 50, offset: Int = 0): MessagePage!
  }
`;

export default {
  typeDefs: messageTypeDefs,
};
