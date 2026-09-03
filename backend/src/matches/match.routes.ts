import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { validateRequest } from '../http/validate-request.js'
import { createMatchForAlias } from './match.service.js'

const createMatchSchema = {
  body: z.object({
    alias: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[\p{L}\p{N}_ -]+$/u, 'Alias contains unsupported characters'),
  }),
}

export async function registerMatchRoutes(app: FastifyInstance): Promise<void> {
  app.post('/matches', async (request, reply) => {
    const { body } = validateRequest(request, createMatchSchema)
    const match = await createMatchForAlias(body.alias)

    return reply.status(201).send(match)
  })
}