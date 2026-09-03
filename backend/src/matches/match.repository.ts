import { prisma } from '../database/prisma.js'

export function createMatch(playerId: string) {
  return prisma.match.create({
    data: { playerId },
  })
}