import { createMatch } from './match.repository.js'
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