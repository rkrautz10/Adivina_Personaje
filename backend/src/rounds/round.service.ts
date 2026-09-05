import { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { findFreshEntity, saveEntity } from '../entities/entity-cache.repository.js'
import { AppError } from '../errors/app-error.js'
import { expireAbandonedRound } from '../matches/abandonment.service.js'
import { PokeApiProvider } from '../providers/pokeapi.provider.js'
import { calculateScore } from '../scoring/scoring.service.js'
import { normalizeText } from '../utils/normalize-text.js'
import { obfuscateImage } from './image-obfuscation.js'
import { createRound, findMatchWithRounds, findRoundImage, resolveRound } from './round.repository.js'

const EASY_ID_MAX = 151
const MAX_SELECTION_ATTEMPTS = 3
const MAX_ROUNDS_PER_MATCH = 10
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000

const characterProvider = new PokeApiProvider()

function pickEasyCharacterId(): number {
  return Math.floor(Math.random() * EASY_ID_MAX) + 1
}

async function getCharacterForRound() {
  for (let attempt = 0; attempt < MAX_SELECTION_ATTEMPTS; attempt += 1) {
    const entityId = pickEasyCharacterId()
    const cachedEntity = await findFreshEntity(entityId)

    if (cachedEntity) {
      return cachedEntity
    }

    try {
      const character = await characterProvider.getCharacter(entityId)
      return saveEntity(character, new Date(Date.now() + CACHE_TTL_MS))
    } catch (error) {
      if (error instanceof AppError && error.code === 'UPSTREAM_UNAVAILABLE') {
        continue
      }

      throw error
    }
  }

  throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Unable to select a character')
}

export async function createRoundForMatch(matchId: string) {
  await prisma.$transaction(
    async (transaction) => {
      await expireAbandonedRound(transaction, { matchId })
    },
    { isolationLevel: 'Serializable' },
  )
  const match = await findMatchWithRounds(matchId)

  if (!match) {
    throw new AppError(404, 'NOT_FOUND', 'Match not found')
  }

  if (match.status !== 'IN_PROGRESS') {
    throw new AppError(409, 'CONFLICT', 'Match is not active')
  }

  if (match.rounds.some((round) => round.status === 'ACTIVE')) {
    throw new AppError(409, 'CONFLICT', 'Match already has an active round')
  }

  if (match.rounds.length >= MAX_ROUNDS_PER_MATCH) {
    throw new AppError(409, 'CONFLICT', 'Match reached its round limit')
  }

  const entity = await getCharacterForRound()

  try {
    const round = await createRound(match.id, match.rounds.length + 1, entity.entityId, entity.name)

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      imageUrl: `/rounds/${round.id}/image`,
      obfuscationLevel: 'HIGH',
      timeLimitMs: 30_000,
      difficultyLevel: match.difficultyLevel,
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'CONFLICT', 'Match already has an active round')
    }

    throw error
  }
}

export async function getRoundImage(roundId: string) {
  const round = await findRoundImage(roundId)

  if (!round) {
    throw new AppError(404, 'NOT_FOUND', 'Round not found')
  }

  if (round.status === 'EXPIRED') {
    throw new AppError(409, 'CONFLICT', 'Round expired without revealing its entity')
  }

  let response: Response
  try {
    response = await fetch(round.entity.imageUrl, { signal: AbortSignal.timeout(3_000) })
  } catch {
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character image is unavailable')
  }

  if (!response.ok || !response.body) {
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character image is unavailable')
  }

  const image = Buffer.from(await response.arrayBuffer())

  if (round.status === 'RESOLVED') {
    return {
      contentType: response.headers.get('content-type') ?? 'image/png',
      image,
    }
  }

  try {
    return {
      contentType: 'image/png',
      image: await obfuscateImage(image),
    }
  } catch {
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character image could not be transformed')
  }
}

export async function resolveGuess(roundId: string, guess: string) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        await expireAbandonedRound(transaction, { roundId })
        const round = await transaction.round.findUnique({
          where: { id: roundId },
          include: { match: true },
        })

        if (!round) {
          throw new AppError(404, 'NOT_FOUND', 'Round not found')
        }

        if (round.status !== 'ACTIVE') {
          throw new AppError(409, 'CONFLICT', 'Round is not active')
        }

        const correct = normalizeText(guess) === normalizeText(round.entityName)
        const score = calculateScore({
          correct,
          elapsedMs: Date.now() - round.startedAt.getTime(),
          hintsUsed: round.hintsUsed,
          currentStreak: round.match.currentStreak,
        })

        const updateResult = await resolveRound(transaction, round.id, correct, score.scoreDelta)
        if (updateResult.count === 0) {
          throw new AppError(409, 'CONFLICT', 'Round is not active')
        }

        const match = await transaction.match.update({
          where: { id: round.matchId },
          data: {
            currentStreak: score.nextStreak,
            totalScore: { increment: score.scoreDelta },
          },
        })

        return {
          correct,
          revealedName: round.entityName,
          scoreDelta: score.scoreDelta,
          totalScore: match.totalScore,
          currentStreak: match.currentStreak,
          roundStatus: 'RESOLVED' as const,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AppError(409, 'CONFLICT', 'Round is being resolved')
    }

    throw error
  }
}