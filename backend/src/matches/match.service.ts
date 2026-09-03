import { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { AppError } from '../errors/app-error.js'
import { createMatch, findMatchForFinish, finishMatch } from './match.repository.js'
import { findOrCreatePlayer } from '../players/player.repository.js'

export function normalizeAlias(alias: string): string {
  return alias.trim().toLocaleLowerCase('es')
}

export async function createMatchForAlias(alias: string) {
  const visibleAlias = alias.trim()
  const player = await findOrCreatePlayer(visibleAlias, normalizeAlias(visibleAlias))
  const match = await createMatch(player.id)

  return {
    matchId: match.id,
    playerId: player.id,
    alias: player.alias,
    status: match.status,
    difficultyLevel: match.difficultyLevel,
    totalScore: match.totalScore,
    startedAt: match.startedAt,
  }
}

function toFinishedMatchResponse(match: {
  id: string
  status: string
  totalScore: number
  finishedAt: Date | null
  rounds: unknown[]
}) {
  return {
    matchId: match.id,
    status: match.status,
    totalScore: match.totalScore,
    roundsPlayed: match.rounds.length,
    finishedAt: match.finishedAt,
  }
}

export async function finishMatchById(matchId: string) {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const match = await findMatchForFinish(transaction, matchId)

        if (!match) {
          throw new AppError(404, 'NOT_FOUND', 'Match not found')
        }

        if (match.status === 'FINISHED') {
          return toFinishedMatchResponse(match)
        }

        if (match.rounds.some((round) => round.status === 'ACTIVE')) {
          throw new AppError(409, 'CONFLICT', 'Match has an active round')
        }

        const result = await finishMatch(transaction, match.id)
        if (result.count === 0) {
          const finishedMatch = await findMatchForFinish(transaction, match.id)
          if (finishedMatch?.status === 'FINISHED') {
            return toFinishedMatchResponse(finishedMatch)
          }

          throw new AppError(409, 'CONFLICT', 'Match could not be finished')
        }

        const finishedMatch = await findMatchForFinish(transaction, match.id)
        if (!finishedMatch) {
          throw new AppError(404, 'NOT_FOUND', 'Match not found')
        }

        return toFinishedMatchResponse(finishedMatch)
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new AppError(409, 'CONFLICT', 'Match is being finished')
    }

    throw error
  }
}