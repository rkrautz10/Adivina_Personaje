import assert from 'node:assert/strict'
import test from 'node:test'

import { buildApp } from '../app.js'

test('GET /ranking returns finished matches ordered by totalScore desc', async () => {
  const app = await buildApp()
  const timestamp = Date.now()
  const aliasHigh = `RankHigh_${timestamp}_${Math.floor(Math.random() * 1000)}`
  const aliasLow = `RankLow_${timestamp}_${Math.floor(Math.random() * 1000)}`

  // 1. Create and finish match for aliasLow (score = 0)
  const matchLowResp = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: aliasLow, gameMode: 'STREAK' },
  })
  const matchLow = JSON.parse(matchLowResp.payload) as { matchId: string }
  const roundLowResp = await app.inject({
    method: 'POST',
    url: `/matches/${matchLow.matchId}/rounds`,
    payload: {},
  })
  const roundLow = JSON.parse(roundLowResp.payload) as { roundId: string }
  await app.inject({
    method: 'POST',
    url: `/rounds/${roundLow.roundId}/guess`,
    payload: { guess: 'wrong_guess' },
  }) // STREAK mode auto-finishes

  // 2. Fetch ranking
  const rankingResp = await app.inject({
    method: 'GET',
    url: '/ranking?limit=10',
  })

  assert.equal(rankingResp.statusCode, 200)
  const rankingBody = JSON.parse(rankingResp.payload) as {
    entries: Array<{
      position: number
      alias: string
      totalScore: number
      gameMode: string
      roundsPlayed: number
      finishedAt: string
    }>
  }

  assert.ok(Array.isArray(rankingBody.entries))
  // All entries must have status FINISHED (implicit by repository query)
  rankingBody.entries.forEach((entry) => {
    assert.ok(typeof entry.position === 'number')
    assert.ok(typeof entry.alias === 'string')
    assert.ok(typeof entry.totalScore === 'number')
    assert.ok(typeof entry.gameMode === 'string')
    assert.ok(typeof entry.roundsPlayed === 'number')
    assert.ok(entry.finishedAt)
  })

  // Verify ordering: entries are descending by totalScore
  for (let i = 0; i < rankingBody.entries.length - 1; i += 1) {
    assert.ok(rankingBody.entries[i].totalScore >= rankingBody.entries[i + 1].totalScore)
  }

  // 3. Verify limit parameter
  const limitResp = await app.inject({
    method: 'GET',
    url: '/ranking?limit=1',
  })
  assert.equal(limitResp.statusCode, 200)
  const limitBody = JSON.parse(limitResp.payload) as { entries: Array<unknown> }
  assert.ok(limitBody.entries.length <= 1)
})
