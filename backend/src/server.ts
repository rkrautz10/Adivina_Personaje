import cors from '@fastify/cors'
import dotenv from 'dotenv'
import Fastify from 'fastify'
import { z } from 'zod'

dotenv.config()

const environment = z
  .object({
    PORT: z.coerce.number().int().positive().default(3001),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  })
  .parse(process.env)

const app = Fastify({ logger: true })

await app.register(cors, { origin: environment.FRONTEND_ORIGIN })

app.get('/health', async () => ({ status: 'ok' }))

await app.listen({ host: '0.0.0.0', port: environment.PORT })