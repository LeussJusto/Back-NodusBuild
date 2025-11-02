import { gql } from 'graphql-tag';
import authResolver from '../resolvers/authResolver';

export const userSchema = gql`
  type Profile {
    firstName: String
    lastName: String
    phone: String
    avatar: String
  }

  type User {
    id: ID!
    email: String!
    profile: Profile
    role: String
    isActive: Boolean
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input ProfileInput {
    firstName: String
    lastName: String
    phone: String
  }

  input RegisterInput {
    email: String!
    password: String!
    profile: ProfileInput
  }

  type Query {
    hello: String
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    uploadAvatar(avatarUrl: String!): User!
  }
`;

export const userSchemaDefinition = {
  typeDefs: userSchema,
  resolvers: authResolver,
};

export default userSchemaDefinition;
