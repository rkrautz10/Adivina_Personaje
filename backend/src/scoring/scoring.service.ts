const BASE_SCORE = 100
const MAX_SPEED_BONUS = 50
const TIME_LIMIT_MS = 30_000
const HINT_PENALTY = 15

type ScoreInput = {
  correct: boolean
  elapsedMs: number
  hintsUsed: number
  currentStreak: number
}

export type ScoreResult = {
  scoreDelta: number
  nextStreak: number
}

export function calculateScore({ correct, elapsedMs, hintsUsed, currentStreak }: ScoreInput): ScoreResult {
  if (!correct) {
    return { scoreDelta: 0, nextStreak: 0 }
  }

  const speedBonus = Math.max(0, Math.round(MAX_SPEED_BONUS * (1 - elapsedMs / TIME_LIMIT_MS)))
  const streakMultiplier = 1 + 0.1 * Math.min(currentStreak, 5)
  const scoreBeforeMultiplier = BASE_SCORE + speedBonus - HINT_PENALTY * hintsUsed

  return {
    scoreDelta: Math.max(0, Math.round(scoreBeforeMultiplier * streakMultiplier)),
    nextStreak: currentStreak + 1,
  }
}