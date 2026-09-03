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