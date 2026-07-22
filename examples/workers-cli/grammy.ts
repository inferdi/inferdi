import { Bot, type Context, type MiddlewareFn } from 'grammy'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer
} from '../_shared/container.js'

const root = buildRootContainer()

type BotContext = Context & {
  container: RequestContainer
}

const withContainer: MiddlewareFn<BotContext> = async (ctx, next) => {
  await using scope = await createRequestScope(root, {
    requestId: String(ctx.update.update_id),
    userId: ctx.from?.id !== undefined ? String(ctx.from.id) : undefined
  })

  ctx.container = scope
  await next()
}

export const bot = new Bot<BotContext>(process.env.BOT_TOKEN!)

bot.use(withContainer)
bot.command('help', async (ctx) => {
  const profile = await ctx.container.get('users').profile(String(ctx.from?.id ?? 'anonymous'))
  await ctx.reply(`Chat profile: ${profile.name}`)
})
