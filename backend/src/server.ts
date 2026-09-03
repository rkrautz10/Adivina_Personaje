import cors from '@fastify/cors'
import Fastify from 'fastify'

import { environment } from './config/env.js'
import { registerErrorHandler } from './errors/error-handler.js'
import { registerMatchRoutes } from './matches/match.routes.js'
import { registerRoundRoutes } from './rounds/round.routes.js'

const app = Fastify({ logger: true })

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

await app.listen({ host: '0.0.0.0', port: environment.PORT })