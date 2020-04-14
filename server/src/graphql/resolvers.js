const {
  UserInputError,
  ForbiddenError,
  GraphQLError
} = require('apollo-server-express')
const bcrypt = require('bcrypt')
const { User, Graph, Key, Trace } = require('../persistence')
const { DateTimeResolver, JSONResolver } = require('graphql-scalars')
const { Cursor } = require('./utils')

// todo this should be injected for testing.
function processDates(from, to) {
  const dayMs = 86400000
  if (!to) {
    to = new Date()
  }
  if (!from) {
    from = new Date(to - dayMs)
  }

  return {
    from,
    to
  }
}

module.exports = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Query: {
    traceFilterOptions: (_, { graphId }, { req }) => {
      // TODO permissions
      const options = Trace.findFilterOptions({ graphId })

      return {
        ...options,
        hasErrors: ['true', 'false']
      }
    },
    user: (_, _args, { req }) => {
      // TODO permissions
      return User.findById(req.session.userId)
    },
    graph: (_, { graphId, ...rest }, { req }) => {
      // TODO permissions
      return Graph.findById(graphId)
    },
    traces: async (
      _,
      { graphId, after, operationId, orderBy, to, from, traceFilters },
      { req }
    ) => {
      // TODO permissions
      //
      if (!traceFilters) {
        traceFilters = []
      }
      if (!orderBy) {
        orderBy = { field: 'duration', asc: false }
      }

      const limit = 10
      const [cursor] = Cursor.decode(after)
      const nodes = await Trace.findAll(
        [
          ...traceFilters,
          { field: 'graphId', operator: 'eq', value: graphId },
          operationId && {
            field: 'operationId',
            operator: 'eq',
            value: operationId
          }
        ],
        processDates(from, to),
        orderBy,
        cursor,
        limit
      )

      // we always fetch one more than we need to calculate hasNextPage
      const hasNextPage = nodes.length >= limit

      return {
        cursor: hasNextPage
          ? Cursor.encode(nodes.pop(), 'id', orderBy.asc)
          : '',
        nodes
      }
    },
    trace: async (_, { traceId }, { req }) => {
      const t = await Trace.findById(traceId)
      console.log(t)
      return t
    },
    operations: async (
      _,
      { graphId, orderBy, after, traceFilters, to, from },
      { req }
    ) => {
      // TODO permissions
      if (!orderBy) {
        orderBy = { field: 'count', asc: false }
      }

      if (!traceFilters) {
        traceFilters = []
      }

      const limit = 7
      const cursor = Cursor.decode(after)
      const nodes = await Trace.findAllOperations(
        [...traceFilters, { field: 'graphId', operator: 'eq', value: graphId }],
        processDates(from, to),
        orderBy,
        cursor,
        limit
      )

      // we always fetch one more than we need to calculate hasNextPage
      const hasNextPage = nodes.length >= limit

      return {
        cursor: hasNextPage
          ? Cursor.encode(nodes.pop(), 'rowNumber', orderBy.asc)
          : '',
        nodes
      }
    },
    rpm: async (
      _,
      { graphId, operationId, to, from, traceFilters },
      { req }
    ) => {
      if (!traceFilters) {
        traceFilters = []
      }

      const nodes = await Trace.findRPM(
        [
          ...traceFilters,
          { field: 'graphId', operator: 'eq', value: graphId },
          operationId && {
            field: 'operationId',
            operator: 'eq',
            value: operationId
          }
        ],
        processDates(from, to)
      )

      return {
        nodes,
        cursor: ''
      }
    },
    latencyDistribution: async (
      _,
      { graphId, operationId, traceFilters, to, from },
      { req }
    ) => {
      if (!traceFilters) {
        traceFilters = []
      }

      const nodes = await Trace.latencyDistribution(
        [
          ...traceFilters,
          { field: 'graphId', operator: 'eq', value: graphId },
          operationId && {
            field: 'operationId',
            operator: 'eq',
            value: operationId
          }
        ],
        processDates(from, to)
      )

      return {
        nodes,
        cursor: ''
      }
    },
    stats: async (
      _,
      { graphId, operationId, traceFilters, to, from },
      { req }
    ) => {
      if (!traceFilters) {
        traceFilters = []
      }

      return Trace.findStats(
        [
          ...traceFilters,
          { field: 'graphId', operator: 'eq', value: graphId },
          operationId && {
            field: 'operationId',
            operator: 'eq',
            value: operationId
          }
        ],
        processDates(from, to)
      )
    },
    operation: async (
      _,
      { graphId, operationId, traceFilters, to, from },
      { req }
    ) => {
      if (!traceFilters) {
        traceFilters = []
      }

      const rows = await Trace.findAllOperations(
        [
          ...traceFilters,
          { field: 'graphId', operator: 'eq', value: graphId },
          operationId && {
            field: 'operationId',
            operator: 'eq',
            value: operationId
          }
        ],
        processDates(from, to)
      )

      return rows[0]
    }
  },
  Mutation: {
    userLogin: async (_, { email }, { req, magicLink }) => {
      let user = await User.find(email)

      if (!user) {
        try {
          user = await User.create(email)
        } catch (e) {
          throw new ForbiddenError()
        }
      }

      await magicLink.send(user)
      return true
    },
    tokenVerify: async (_, { token }, { req, magicLink }) => {
      const user = await magicLink.verify(token)
      req.session.userId = user.id
      req.session.userEmail = user.email

      console.log(user)
      return user
    },
    userLogout: async (_, {}, { req }) => {
      try {
        req.session.destroy()

        return true
      } catch (error) {
        throw new GraphQLError(`DELETE session >> ${error.stack}`)
      }
    },
    graphCreate: async (_, { name }, { req }) => {
      const userId = req.session.userId

      if (name.length === 0) {
        throw new UserInputError('name cannot be empty')
      }

      return Graph.create(name, userId)
    },
    keyCreate: (_, { graphId }, { req }) => {
      // TODO permissions
      return Key.create(graphId)
    }
  },
  Graph: {
    user: ({ userId }) => {
      return User.findById(userId)
    },
    keys: ({ id }) => {
      return Key.findAll({ graphId: id })
    },
    stats: ({ id }, { traceFilters, from, to }) => {
      if (!traceFilters) {
        traceFilters = []
      }

      return Trace.findStats(
        [...traceFilters, { field: 'graphId', operator: 'eq', value: id }],
        processDates(from, to)
      )
    }
  },
  User: {
    graphs: ({ id }) => {
      return Graph.findAll({ userId: id })
    }
  },
  Key: {
    secret: ({ graphId, secret }) => {
      return `${graphId}:${Key.decrypt(secret)}`
    },
    graph: ({ graphId }) => {
      return Graph.findById(graphId)
    }
  },
  Operation: {
    stats: ({ duration, count, errorCount, errorPercent }) => {
      return { duration, count, errorCount, errorPercent }
    }
  }
}
