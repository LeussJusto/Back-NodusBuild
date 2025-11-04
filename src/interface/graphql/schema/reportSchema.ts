import gql from 'graphql-tag';
import reportResolver from '../resolvers/reportResolver';

// Definición del esquema GraphQL para reportes
const typeDefs = gql`
  enum ReportType {
    daily
    general
  }

  enum ReportStatus {
    draft
    in_review
    approved
    rejected
  }

  type ReportChecklistItem {
    item: String!
    completed: Boolean!
    evidenceId: String
  }

  input ReportChecklistItemInput {
    item: String!
    completed: Boolean!
    evidenceId: String
  }

  type ReportReviewer {
    user: User!
    approved: Boolean
    reviewedAt: String
    feedback: String
  }

  type Report {
    id: ID!
    project: Project!
    createdBy: User!
    type: ReportType!
    date: String!
    relatedTasks: [Task!]!
    content: String
    checklist: [ReportChecklistItem!]!
    status: ReportStatus!
    reviewers: [ReportReviewer!]!
    attachments: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateDailyInput {
    project: ID!
    date: String
    content: String
    checklist: [ReportChecklistItemInput!]
    attachments: [String!]
  }

  input CreateGeneralInput {
    project: ID!
    taskId: ID!
    date: String
    content: String
    checklist: [ReportChecklistItemInput!]
    attachments: [String!]
  }

  input UpdateReportInput {
    date: String
    content: String
    checklist: [ReportChecklistItemInput!]
    attachments: [String!]
  }

  input ApproveReportInput {
    reportId: ID!
    feedback: String
  }

  input RejectReportInput {
    reportId: ID!
    feedback: String
  }

  extend type Query {
    report(id: ID!): Report
    reportsByProject(projectId: ID!): [Report!]!
    myReports(projectId: ID!): [Report!]!
  }

  extend type Mutation {
    createDailyReport(input: CreateDailyInput!): Report!
    createGeneralReport(input: CreateGeneralInput!): Report!
    updateReport(id: ID!, input: UpdateReportInput!): Report!
    submitReportForReview(id: ID!): Report!
    approveReport(input: ApproveReportInput!): Report!
    rejectReport(input: RejectReportInput!): Report!
    deleteReport(id: ID!): Boolean!
  }
`;

export default {
  typeDefs,
  resolvers: reportResolver,
};
