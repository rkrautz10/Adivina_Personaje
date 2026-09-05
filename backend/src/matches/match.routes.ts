import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { validateRequest } from '../http/validate-request.js'
import { createMatchForAlias, finishMatchById } from './match.service.js'

const createMatchSchema = {
  body: z.object({
    alias: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[\p{L}\p{N}_ -]+$/u, 'Alias contains unsupported characters'),
    gameMode: z.enum(['STANDARD', 'STREAK']).default('STANDARD'),
  }),
}

const finishMatchSchema = {
  params: z.object({ matchId: z.string().trim().min(1) }),
}

export async function registerMatchRoutes(app: FastifyInstance): Promise<void> {
  app.post('/matches', async (request, reply) => {
    const { body } = validateRequest(request, createMatchSchema)
    const match = await createMatchForAlias(body.alias, body.gameMode)

    return reply.status(201).send(match)
  })

  app.post('/matches/:matchId/finish', async (request) => {
    const { params } = validateRequest(request, finishMatchSchema)
    return finishMatchById(params.matchId)
  })
}