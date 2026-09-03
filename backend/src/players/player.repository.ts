import { prisma } from '../database/prisma.js'

export function findOrCreatePlayer(alias: string, normalizedAlias: string) {
  return prisma.player.upsert({
    where: { normalizedAlias },
    create: { alias, normalizedAlias },
    update: {},
  })
}