import cors from '@fastify/cors'
import Fastify from 'fastify'

import { environment } from './config/env.js'
import { registerErrorHandler } from './errors/error-handler.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: environment.FRONTEND_ORIGIN })
registerErrorHandler(app)

app.get('/health', async () => ({ status: 'ok' }))

if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug/error', async () => {
    throw new Error('Controlled error for local validation')
  })
}

await app.listen({ host: '0.0.0.0', port: environment.PORT })