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
  timeoutMs: environment.AI_TIMEOUT_MS,
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

function selectAttributesForLevel(attributes: HintAttributes, level: HintLevel): HintAttributes {
  switch (level) {
    case 1:
      return { types: attributes.types?.slice(0, 1) }
    case 2:
      return { height: attributes.height }
    case 3:
      return { abilities: attributes.abilities?.slice(0, 1) }
  }
}

function hasAllowedAttribute(attributes: HintAttributes, level: HintLevel): boolean {
  switch (level) {
    case 1:
      return Boolean(attributes.types?.[0])
    case 2:
      return attributes.height !== undefined
    case 3:
      return Boolean(attributes.abilities?.[0])
  }
}

function isDuplicateHint(hint: string, previousHints: string[]): boolean {
  const normalizedHint = hint.trim().toLocaleLowerCase('es')
  return previousHints.some((previousHint) => previousHint.trim().toLocaleLowerCase('es') === normalizedHint)
}

function mentionsDisallowedAttribute(hint: string, attributes: HintAttributes, level: HintLevel): boolean {
  const normalizedHint = hint.toLocaleLowerCase('es')
  const disallowedValues = [
    ...(level === 1 ? attributes.abilities ?? [] : []),
    ...(level === 2 ? [...(attributes.types ?? []), ...(attributes.abilities ?? [])] : []),
    ...(level === 3 ? attributes.types ?? [] : []),
  ]

  return disallowedValues.some((value) => normalizedHint.includes(value.toLocaleLowerCase('es')))
}

async function generateSafeHint(
  attributes: HintAttributes,
  level: HintLevel,
  entityName: string,
  previousHints: string[],
): Promise<string> {
  const allowedAttributes = selectAttributesForLevel(attributes, level)

  if (hasAllowedAttribute(allowedAttributes, level)) {
    try {
      const hint = await llmProvider.generateHint(allowedAttributes, level, previousHints)
      if (
        !containsSpoiler(hint, entityName) &&
        !isDuplicateHint(hint, previousHints) &&
        !mentionsDisallowedAttribute(hint, attributes, level)
      ) {
        return hint
      }
    } catch (error) {
      if (!(error instanceof HintProviderError)) {
        throw error
      }
    }
  }

  const fallback = await fallbackProvider.generateHint(allowedAttributes, level, previousHints)
  if (containsSpoiler(fallback, entityName)) {
    return 'Tiene rasgos distintivos que permiten reconocerlo.'
  }

  return fallback
}

type HintRound = {
  id: string
  status: string
  hintsUsed: number
  hints: Prisma.JsonValue
  entityName: string
  match: { status: string }
  entity: { attributes: Prisma.JsonValue }
}

function assertHintCanBeRequested(round: HintRound): void {
  if (round.match.status !== 'IN_PROGRESS' || round.status !== 'ACTIVE') {
    throw new AppError(409, 'CONFLICT', 'Round is not active')
  }

  if (round.hintsUsed >= MAX_HINTS_PER_ROUND) {
    throw new AppError(409, 'CONFLICT', 'Round reached its hint limit')
  }
}

async function findActiveHintRound(transaction: Prisma.TransactionClient, roundId: string): Promise<HintRound> {
  await expireAbandonedRound(transaction, { roundId })

  const round = await transaction.round.findUnique({
    where: { id: roundId },
    include: { match: true, entity: { select: { attributes: true } } },
  })

  if (!round) {
    throw new AppError(404, 'NOT_FOUND', 'Round not found')
  }

  assertHintCanBeRequested(round)
  return round
}

export async function requestHint(roundId: string) {
  try {
    const round = await prisma.$transaction(
      async (transaction) => {
        return findActiveHintRound(transaction, roundId)
      },
      { isolationLevel: 'Serializable' },
    )
    const hints = Array.isArray(round.hints) ? round.hints : []
    const previousHints = hints.filter((hint): hint is string => typeof hint === 'string')
    const level = (round.hintsUsed + 1) as HintLevel
    const hint = await generateSafeHint(toHintAttributes(round.entity.attributes), level, round.entityName, previousHints)

    return await prisma.$transaction(
      async (transaction) => {
        const currentRound = await findActiveHintRound(transaction, roundId)
        if (currentRound.hintsUsed !== round.hintsUsed) {
          throw new AppError(409, 'CONFLICT', 'Hint request conflicts with another request')
        }

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