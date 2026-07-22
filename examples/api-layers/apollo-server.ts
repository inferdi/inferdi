import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer
} from '../_shared/container.js'

const root = buildRootContainer()

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

type GraphQLContext = { readonly container: RequestContainer }

const typeDefs = `#graphql
  type User { id: ID!, name: String! }
  type Query { user(id: ID!): User! }
`

const resolvers = {
  Query: {
    user: (_parent: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.container.get('users').profile(args.id)
  }
}

export const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        return {
          /*
           * NOTE: `willSendResponse` fires once Apollo has built the response
           * payload. For `@defer`/`@stream` operations parts of the response
           * are still streaming AFTER this point — if your resolvers consume
           * scoped DB connections that must survive streaming, dispose from a
           * transport-level hook (e.g. res.once('finish') in your HTTP layer)
           * instead and pass the scope through the standalone server's
           * `context` callback as below
           */
          async willSendResponse({ contextValue }) {
            await contextValue.container.dispose()
          }
        }
      }
    }
  ]
})

export async function start() {
  return startStandaloneServer(server, {
    context: async ({ req }) => ({
      container: await createRequestScope(root, {
        requestId: crypto.randomUUID(),
        userId: normalizeHeader(req.headers.authorization)
      })
    })
  })
}
