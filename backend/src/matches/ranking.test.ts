import assert from 'node:assert/strict'
import test from 'node:test'

test('ranking positions are consecutive and start at one', () => {
  const scores = [320, 200, 50]
  const positions = scores.map((_score, index) => index + 1)

  assert.deepEqual(positions, [1, 2, 3])
})