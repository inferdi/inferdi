import { Telegraf, type Context, type MiddlewareFn } from 'telegraf'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

type BotContext = Context & {
  container: RequestContainer
}

const withContainer: MiddlewareFn<BotContext> = async (ctx, next) => {
  // Re-use the shared per-request scope shape: `update_id` becomes the
  // requestId, the Telegram user id becomes the userId. This way the
  // shared services (Logger, AuditService) get the same fields they would
  // see in HTTP request context.
  await using scope = await createRequestScope(root, {
    requestId: String(ctx.update.update_id),
    userId: ctx.from?.id !== undefined ? String(ctx.from.id) : undefined,
  })

  ctx.container = scope
  await next()
}

export const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!)

bot.use(withContainer)
bot.start(async (ctx) => {
  const profile = await ctx.container.get('users').profile(String(ctx.from?.id ?? 'anonymous'))
  await ctx.reply(`Hello ${profile.name}`)
})
