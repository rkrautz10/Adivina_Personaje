import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateScore } from './scoring.service.js'

test('calculates maximum score for immediate correct answer without hints or streak', () => {
  const result = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 0,
    currentStreak: 0,
  })

  // Base 100 + speedBonus 50 = 150, multiplier 1.0 = 150
  assert.equal(result.scoreDelta, 150)
  assert.equal(result.nextStreak, 1)
})

test('reduces speed bonus linearly over 30 seconds', () => {
  const at15s = calculateScore({
    correct: true,
    elapsedMs: 15_000,
    hintsUsed: 0,
    currentStreak: 0,
  })
  // Base 100 + speedBonus 25 = 125
  assert.equal(at15s.scoreDelta, 125)

  const at30s = calculateScore({
    correct: true,
    elapsedMs: 30_000,
    hintsUsed: 0,
    currentStreak: 0,
  })
  // Base 100 + speedBonus 0 = 100
  assert.equal(at30s.scoreDelta, 100)

  const past30s = calculateScore({
    correct: true,
    elapsedMs: 45_000,
    hintsUsed: 0,
    currentStreak: 0,
  })
  // Base 100 + speedBonus 0 (floor) = 100
  assert.equal(past30s.scoreDelta, 100)
})

test('applies hint penalties correctly', () => {
  const hint1 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 1,
    currentStreak: 0,
  })
  // Base 100 + 50 - 15 = 135
  assert.equal(hint1.scoreDelta, 135)

  const hint2 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 2,
    currentStreak: 0,
  })
  // Base 100 + 50 - 30 = 120
  assert.equal(hint2.scoreDelta, 120)

  const hint3 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 3,
    currentStreak: 0,
  })
  // Base 100 + 50 - 45 = 105
  assert.equal(hint3.scoreDelta, 105)
})

test('applies streak multiplier and caps streak bonus at 5', () => {
  const streak1 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 0,
    currentStreak: 1,
  })
  // (100 + 50) * 1.1 = 165
  assert.equal(streak1.scoreDelta, 165)
  assert.equal(streak1.nextStreak, 2)

  const streak5 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 0,
    currentStreak: 5,
  })
  // (100 + 50) * 1.5 = 225
  assert.equal(streak5.scoreDelta, 225)
  assert.equal(streak5.nextStreak, 6)

  const streak10 = calculateScore({
    correct: true,
    elapsedMs: 0,
    hintsUsed: 0,
    currentStreak: 10,
  })
  // Capped at 5 multiplier (1.5) -> (100 + 50) * 1.5 = 225
  assert.equal(streak10.scoreDelta, 225)
  assert.equal(streak10.nextStreak, 11)
})

test('resets score and streak on incorrect answer', () => {
  const incorrect = calculateScore({
    correct: false,
    elapsedMs: 1_000,
    hintsUsed: 0,
    currentStreak: 5,
  })

  assert.equal(incorrect.scoreDelta, 0)
  assert.equal(incorrect.nextStreak, 0)
})

test('ensures scoreDelta is never negative', () => {
  const worstCase = calculateScore({
    correct: true,
    elapsedMs: 60_000,
    hintsUsed: 10, // Extreme hint penalty
    currentStreak: 0,
  })

  assert.equal(worstCase.scoreDelta, 0)
})
