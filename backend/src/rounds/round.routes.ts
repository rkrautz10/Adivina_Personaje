import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { validateRequest } from '../http/validate-request.js'
import { requestHint } from '../hints/hint.service.js'
import { createRoundForMatch, getRoundImage, resolveGuess } from './round.service.js'

const roundParamsSchema = {
  params: z.object({ matchId: z.string().trim().min(1) }),
}

const imageParamsSchema = {
  params: z.object({ roundId: z.string().trim().min(1) }),
}

const guessSchema = {
  params: z.object({ roundId: z.string().trim().min(1) }),
  body: z.object({ guess: z.string().trim().min(1).max(100) }),
}

export async function registerRoundRoutes(app: FastifyInstance): Promise<void> {
  app.post('/matches/:matchId/rounds', async (request, reply) => {
    const { params } = validateRequest(request, roundParamsSchema)
    const round = await createRoundForMatch(params.matchId)

    return reply.status(201).send(round)
  })

  app.get('/rounds/:roundId/image', async (request, reply) => {
    const { params } = validateRequest(request, imageParamsSchema)
    const image = await getRoundImage(params.roundId)

    return reply.type(image.contentType).send(image.image)
  })

  app.post('/rounds/:roundId/guess', async (request) => {
    const { params, body } = validateRequest(request, guessSchema)
    return resolveGuess(params.roundId, body.guess)
  })

  app.post('/rounds/:roundId/hints', async (request) => {
    const { params } = validateRequest(request, imageParamsSchema)
    return requestHint(params.roundId)
  })
}