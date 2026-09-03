import { prisma } from '../database/prisma.js'
import type { Character } from '../providers/character-provider.js'

export async function findFreshEntity(entityId: number, now = new Date()) {
  return prisma.entityCache.findFirst({
    where: {
      entityId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  })
}

export function saveEntity(character: Character, expiresAt: Date) {
  return prisma.entityCache.upsert({
    where: { entityId: character.entityId },
    create: {
      entityId: character.entityId,
      name: character.name,
      imageUrl: character.artworkUrl,
      attributes: character.attributes,
      expiresAt,
    },
    update: {
      name: character.name,
      imageUrl: character.artworkUrl,
      attributes: character.attributes,
      cachedAt: new Date(),
      expiresAt,
    },
  })
}