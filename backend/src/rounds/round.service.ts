import { Prisma } from '@prisma/client'

import { findFreshEntity, saveEntity } from '../entities/entity-cache.repository.js'
import { AppError } from '../errors/app-error.js'
import { PokeApiProvider } from '../providers/pokeapi.provider.js'
import { createRound, findMatchWithRounds, findRoundImage } from './round.repository.js'

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

  let response: Response
  try {
    response = await fetch(round.entity.imageUrl, { signal: AbortSignal.timeout(3_000) })
  } catch {
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character image is unavailable')
  }

  if (!response.ok || !response.body) {
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character image is unavailable')
  }

  return {
    contentType: response.headers.get('content-type') ?? 'image/png',
    image: Buffer.from(await response.arrayBuffer()),
  }
}