const { ApolloServer, gql } = require('apollo-server-express')

module.exports = gql`
  scalar JSON
  scalar DateTime

  enum FilterOperator {
    eq
    ne
  }

  enum TraceFilterField {
    schemaTag
    clientName
    clientVersion
    hasErrors
  }

  input TraceFilter {
    operator: FilterOperator
    field: TraceFilterField
    value: String
  }

  enum OperationOrderFields {
    duration
    count
    errorCount
    errorPercent
  }

  type TraceFilterOptions {
    schemaTag: [String]
    clientName: [String]
    clientVersion: [String]
    hasErrors: [String]
  }

  input OperationOrderBy {
    asc: Boolean!
    field: OperationOrderFields!
  }

  enum TraceOrderFields {
    duration
    startTime
  }

  input TraceOrderBy {
    asc: Boolean!
    field: TraceOrderFields!
  }

  type User {
    id: ID!
    email: String!
    createdAt: DateTime!
    isVerified: Boolean!
    graphs: [Graph]
  }

  type Graph {
    id: ID!
    name: String!
    createdAt: DateTime!
    user: User
    keys: [Key]!
    stats(traceFilters: [TraceFilter], from: DateTime, to: DateTime): Stats
  }

  type Stats {
    count: Int!
    errorCount: Int!
    errorPercent: Int!
    duration: Float!
  }

  type Key {
    id: ID!
    "Secret is only returned on Create"
    secret: String
    prefix: String!
    createdAt: DateTime!
    graph: Graph!
  }

  type Operation {
    id: String!
    key: String!
    stats: Stats
  }

  type OperationConnection {
    nodes: [Operation]!
    cursor: String
  }

  type TraceConnection {
    nodes: [Trace]!
    cursor: String
  }

  type LatencyDistribution {
    duration: Float!
    count: Int!
  }

  type LatencyDistributionConnection {
    nodes: [LatencyDistribution]!
    cursor: String
  }

  type RPM {
    startTime: DateTime!
    count: Int!
    errorCount: Int!
  }

  type RPMConnection {
    nodes: [RPM]!
    cursor: String
  }

  type Trace {
    id: ID!
    key: String!
    duration: Float!
    startTime: DateTime!
    endTime: DateTime!
    createdAt: DateTime!
    root: JSON!
    details: JSON
  }

  type Query {
    user: User
    graph(graphId: ID!): Graph
    traces(
      graphId: ID!
      operationId: ID
      orderBy: TraceOrderBy
      from: DateTime
      to: DateTime
      after: String
      traceFilters: [TraceFilter]
    ): TraceConnection
    operations(
      graphId: ID!
      orderBy: OperationOrderBy
      after: String
      from: DateTime
      to: DateTime
      traceFilters: [TraceFilter]
    ): OperationConnection
    latencyDistribution(
      graphId: ID!
      operationId: ID
      from: DateTime
      to: DateTime
      traceFilters: [TraceFilter]
    ): LatencyDistributionConnection!
    rpm(
      graphId: ID!
      operationId: ID
      from: DateTime
      to: DateTime
      traceFilters: [TraceFilter]
    ): RPMConnection!
    traceFilterOptions(graphId: ID!): TraceFilterOptions
    stats(
      graphId: ID!
      operationId: ID
      from: DateTime
      to: DateTime
      traceFilters: [TraceFilter]
    ): Stats
    operation(
      graphId: ID!
      operationId: ID
      from: DateTime
      to: DateTime
      traceFilters: [TraceFilter]
    ): Operation
    trace(traceId: ID!): Trace
  }

  type Mutation {
    graphCreate(name: String!): Graph!
    keyCreate(graphId: ID!): Key!
    keyRevoke(keyId: ID!): Boolean!
    userLogout: Boolean!
    userLogin(email: String): Boolean!
    tokenVerify(token: String): User!
  }
`
