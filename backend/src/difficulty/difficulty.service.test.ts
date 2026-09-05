import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateNextDifficulty, getCharacterIdRange } from './difficulty.service.js'

test('keeps difficulty until three resolved rounds exist', () => {
  assert.equal(calculateNextDifficulty('MEDIUM', [true, true]), 'MEDIUM')
})

test('increases one level after three correct recent rounds', () => {
  assert.equal(calculateNextDifficulty('EASY', [true, true, true]), 'MEDIUM')
  assert.equal(calculateNextDifficulty('MEDIUM', [true, true, true]), 'HARD')
  assert.equal(calculateNextDifficulty('HARD', [true, true, true]), 'HARD')
})

test('decreases one level after zero or one correct recent rounds', () => {
  assert.equal(calculateNextDifficulty('HARD', [false, false, false]), 'MEDIUM')
  assert.equal(calculateNextDifficulty('MEDIUM', [true, false, false]), 'EASY')
  assert.equal(calculateNextDifficulty('EASY', [false, false, false]), 'EASY')
})

test('keeps difficulty after two correct recent rounds', () => {
  assert.equal(calculateNextDifficulty('MEDIUM', [true, true, false]), 'MEDIUM')
})

test('maps every difficulty to its configured character range', () => {
  assert.deepEqual(getCharacterIdRange('EASY'), { min: 1, max: 151 })
  assert.deepEqual(getCharacterIdRange('MEDIUM'), { min: 152, max: 493 })
  assert.deepEqual(getCharacterIdRange('HARD'), { min: 494, max: 1025 })
})