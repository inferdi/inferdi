import { createYoga, createSchema } from 'graphql-yoga'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

type GraphQLContext = { readonly container: RequestContainer }

export const yoga = createYoga<GraphQLContext>({
  schema: createSchema<GraphQLContext>({
    typeDefs: /* GraphQL */ `
      type User { id: ID!, name: String! }
      type Query { user(id: ID!): User! }
    `,
    resolvers: {
      Query: {
        user: (_parent, args: { id: string }, ctx) =>
          ctx.container.get('users').profile(args.id),
      },
    },
  }),
  context: async ({ request }) => ({
    container: await createRequestScope(root, {
      requestId: crypto.randomUUID(),
      userId: request.headers.get('authorization') ?? undefined,
    }),
  }),
  plugins: [
    {
      // NOTE: `onExecuteDone` fires once the GraphQL operation finishes. For
      // `@defer`/`@stream` the response continues streaming afterwards, so
      // resolvers running in those incremental payloads would race a disposal
      // started here. For schemas that use incremental delivery, dispose from
      // the HTTP transport-level (`onResponse` in your server framework) and
      // remove this plugin.
      onExecuteDone({ args }) {
        const ctx = args.contextValue as GraphQLContext
        return ctx.container.dispose().catch((err) => {
          console.error('Failed to dispose Yoga request scope', err)
        })
      },
    },
  ],
})
