import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { environment } from './config/env.js'
import { registerErrorHandler } from './errors/error-handler.js'
import { registerMatchRoutes } from './matches/match.routes.js'
import { registerRoundRoutes } from './rounds/round.routes.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(cors, { origin: environment.FRONTEND_ORIGIN })
  registerErrorHandler(app)

  app.get('/health', async () => ({ status: 'ok' }))
  await app.register(registerMatchRoutes)
  await app.register(registerRoundRoutes)

  if (process.env.NODE_ENV !== 'production') {
    app.get('/__debug/error', async () => {
      throw new Error('Controlled error for local validation')
    })
  }

  return app
}
