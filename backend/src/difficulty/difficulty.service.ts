export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD'

const DIFFICULTIES: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD']

const ID_RANGES: Record<DifficultyLevel, { min: number; max: number }> = {
  EASY: { min: 1, max: 151 },
  MEDIUM: { min: 152, max: 493 },
  HARD: { min: 494, max: 1025 },
}

export function calculateNextDifficulty(
  currentDifficulty: DifficultyLevel,
  recentResults: boolean[],
): DifficultyLevel {
  if (recentResults.length < 3) {
    return currentDifficulty
  }

  const correctAnswers = recentResults.slice(-3).filter(Boolean).length
  const currentIndex = DIFFICULTIES.indexOf(currentDifficulty)

  if (correctAnswers === 3) {
    return DIFFICULTIES[Math.min(currentIndex + 1, DIFFICULTIES.length - 1)]
  }

  if (correctAnswers <= 1) {
    return DIFFICULTIES[Math.max(currentIndex - 1, 0)]
  }

  return currentDifficulty
}

export function getCharacterIdRange(difficulty: DifficultyLevel): { min: number; max: number } {
  return ID_RANGES[difficulty]
}