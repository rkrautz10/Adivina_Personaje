import type { Prisma } from '@prisma/client'

export const ABANDONMENT_TIMEOUT_MS = 180_000

export async function expireAbandonedRound(
  transaction: Prisma.TransactionClient,
  filter: { matchId?: string; roundId?: string } = {},
): Promise<boolean> {
  const round = await transaction.round.findFirst({
    where: {
      status: 'ACTIVE',
      ...(filter.matchId === undefined ? {} : { matchId: filter.matchId }),
      ...(filter.roundId === undefined ? {} : { id: filter.roundId }),
    },
    orderBy: { startedAt: 'asc' },
    select: { id: true, matchId: true, startedAt: true },
  })

  if (!round || Date.now() - round.startedAt.getTime() <= ABANDONMENT_TIMEOUT_MS) {
    return false
  }

  const expired = await transaction.round.updateMany({
    where: { id: round.id, status: 'ACTIVE' },
    data: { status: 'EXPIRED', score: 0, resolvedAt: new Date() },
  })

  if (expired.count === 0) {
    return false
  }

  await transaction.match.updateMany({
    where: { id: round.matchId, status: 'IN_PROGRESS' },
    data: { status: 'FINISHED', finishedAt: new Date(), currentStreak: 0 },
  })

  return true
}