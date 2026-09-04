import { Prisma } from '@prisma/client'

import { environment } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { AppError } from '../errors/app-error.js'
import { expireAbandonedRound } from '../matches/abandonment.service.js'
import { FallbackHintProvider } from './fallback-hint.provider.js'
import { HintProviderError } from './hint-provider.error.js'
import { containsSpoiler } from './hint-validation.js'
import { LlmHintProvider } from './llm-hint.provider.js'
import type { HintAttributes, HintLevel } from './hint-provider.js'

const MAX_HINTS_PER_ROUND = 3

const fallbackProvider = new FallbackHintProvider()
const llmProvider = new LlmHintProvider({
  apiKey: environment.AI_API_KEY,
  model: environment.AI_MODEL,
  baseURL: environment.AI_BASE_URL,
})

function toHintAttributes(attributes: Prisma.JsonValue): HintAttributes {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return {}
  }

  const value = attributes as Record<string, unknown>
  return {
    types: Array.isArray(value.types) ? value.types.filter((item): item is string => typeof item === 'string') : undefined,
    height: typeof value.height === 'number' ? value.height : undefined,
    weight: typeof value.weight === 'number' ? value.weight : undefined,
    abilities: Array.isArray(value.abilities)
      ? value.abilities.filter((item): item is string => typeof item === 'string')
      : undefined,
  }
}

async function generateSafeHint(attributes: HintAttributes, level: HintLevel, entityName: string): Promise<string> {
  try {
    const hint = await llmProvider.generateHint(attributes, level)
    if (!containsSpoiler(hint, entityName)) {
      return hint
    }
  } catch (error) {
    if (!(error instanceof HintProviderError)) {
      throw error
    }
  }

  const fallback = await fallbackProvider.generateHint(attributes, level)
  if (containsSpoiler(fallback, entityName)) {
    return 'Tiene rasgos distintivos que permiten reconocerlo.'
  }

  return fallback
}

export async function requestHint(roundId: string) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        await expireAbandonedRound(transaction, { roundId })

        const round = await transaction.round.findUnique({
          where: { id: roundId },
          include: { match: true, entity: { select: { attributes: true } } },
        })

        if (!round) {
          throw new AppError(404, 'NOT_FOUND', 'Round not found')
        }

        if (round.match.status !== 'IN_PROGRESS' || round.status !== 'ACTIVE') {
          throw new AppError(409, 'CONFLICT', 'Round is not active')
        }

        if (round.hintsUsed >= MAX_HINTS_PER_ROUND) {
          throw new AppError(409, 'CONFLICT', 'Round reached its hint limit')
        }

        const level = (round.hintsUsed + 1) as HintLevel
        const hint = await generateSafeHint(toHintAttributes(round.entity.attributes), level, round.entityName)
        const hints = Array.isArray(round.hints) ? round.hints : []
        const updateResult = await transaction.round.updateMany({
          where: { id: round.id, status: 'ACTIVE', hintsUsed: round.hintsUsed },
          data: { hintsUsed: { increment: 1 }, hints: [...hints, hint] },
        })

        if (updateResult.count === 0) {
          throw new AppError(409, 'CONFLICT', 'Hint request conflicts with another request')
        }

        return { hint, hintsUsed: level, remainingHints: MAX_HINTS_PER_ROUND - level }
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AppError(409, 'CONFLICT', 'Hint request conflicts with another request')
    }

    throw error
  }
}