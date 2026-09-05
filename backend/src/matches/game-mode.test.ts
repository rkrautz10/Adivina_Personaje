import assert from 'node:assert/strict'
import test from 'node:test'

const DEFAULT_GAME_MODE = 'STANDARD'
const SUPPORTED_GAME_MODES = ['STANDARD', 'STREAK'] as const

test('uses STANDARD as the default game mode', () => {
  assert.equal(DEFAULT_GAME_MODE, 'STANDARD')
})

test('supports only STANDARD and STREAK game modes', () => {
  assert.deepEqual(SUPPORTED_GAME_MODES, ['STANDARD', 'STREAK'])
})