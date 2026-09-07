import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export function findMatchWithRounds(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: { rounds: { select: { status: true } } },
  })
}

export function createRound(matchId: string, roundNumber: number, entityId: number, entityName: string) {
  return prisma.round.create({
    data: { matchId, roundNumber, entityId, entityName },
  })
}

export function findRoundImage(roundId: string) {
  return prisma.round.findUnique({
    where: { id: roundId },
    select: {
      status: true,
      entity: { select: { imageUrl: true } },
    },
  })
}

export function resolveRound(
  transaction: Prisma.TransactionClient,
  roundId: string,
  correct: boolean,
  score: number,
) {
  return transaction.round.updateMany({
    where: { id: roundId, status: 'ACTIVE' },
    data: {
      status: 'RESOLVED',
      correct,
      score,
      resolvedAt: new Date(),
    },
  })
}