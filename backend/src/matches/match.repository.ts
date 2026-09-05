import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export function createMatch(playerId: string, gameMode: 'STANDARD' | 'STREAK') {
  return prisma.match.create({
    data: { playerId, gameMode },
  })
}

export function findMatchForFinish(transaction: Prisma.TransactionClient, matchId: string) {
  return transaction.match.findUnique({
    where: { id: matchId },
    include: { rounds: { select: { status: true } } },
  })
}

export function finishMatch(transaction: Prisma.TransactionClient, matchId: string) {
  return transaction.match.updateMany({
    where: { id: matchId, status: 'IN_PROGRESS' },
    data: { status: 'FINISHED', finishedAt: new Date() },
  })
}