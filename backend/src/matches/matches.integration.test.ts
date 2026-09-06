import assert from 'node:assert/strict'
import test from 'node:test'

import { buildApp } from '../app.js'

test('GET /health returns status ok', async () => {
  const app = await buildApp()

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  })

  assert.equal(response.statusCode, 200)
  const body = JSON.parse(response.payload) as { status: string }
  assert.equal(body.status, 'ok')
})

test('POST /matches validates alias requirements', async () => {
  const app = await buildApp()

  const response = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: 'a' },
  })

  assert.equal(response.statusCode, 400)
  const body = JSON.parse(response.payload) as { code: string }
  assert.equal(body.code, 'VALIDATION_ERROR')
})

test('POST /matches creates match with default STANDARD gameMode', async () => {
  const app = await buildApp()
  const uniqueAlias = `User_${Date.now()}`

  const response = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: uniqueAlias },
  })

  assert.equal(response.statusCode, 201)
  const body = JSON.parse(response.payload) as {
    matchId: string
    alias: string
    status: string
    gameMode: string
    difficultyLevel: string
  }
  assert.ok(body.matchId)
  assert.equal(body.alias, uniqueAlias)
  assert.equal(body.status, 'IN_PROGRESS')
  assert.equal(body.gameMode, 'STANDARD')
  assert.equal(body.difficultyLevel, 'EASY')
})

test('POST /matches accepts explicit STREAK gameMode', async () => {
  const app = await buildApp()
  const uniqueAlias = `Streak_${Date.now()}`

  const response = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: uniqueAlias, gameMode: 'STREAK' },
  })

  assert.equal(response.statusCode, 201)
  const body = JSON.parse(response.payload) as { gameMode: string }
  assert.equal(body.gameMode, 'STREAK')
})

test('POST /matches/:id/finish enforces active round checks and idempotency', async () => {
  const app = await buildApp()
  const uniqueAlias = `Finisher_${Date.now()}_${Math.floor(Math.random() * 1000)}`

  // 1. Create match
  const createResp = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: uniqueAlias },
  })
  const match = JSON.parse(createResp.payload) as { matchId: string }

  // 2. Create round
  const roundResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/rounds`,
    payload: {},
  })
  assert.equal(roundResp.statusCode, 201)
  const round = JSON.parse(roundResp.payload) as { roundId: string }

  // 3. Attempting finish while active round exists returns 409
  const finishActiveResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/finish`,
    payload: {},
  })
  assert.equal(finishActiveResp.statusCode, 409)

  // 4. Resolve the active round
  const guessResp = await app.inject({
    method: 'POST',
    url: `/rounds/${round.roundId}/guess`,
    payload: { guess: 'wrong_guess' },
  })
  assert.equal(guessResp.statusCode, 200)

  // 5. Finish match
  const finishResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/finish`,
    payload: {},
  })
  assert.equal(finishResp.statusCode, 200)
  const finishBody = JSON.parse(finishResp.payload) as { status: string; roundsPlayed: number }
  assert.equal(finishBody.status, 'FINISHED')
  assert.equal(finishBody.roundsPlayed, 1)

  // 6. Idempotency test: second finish call returns 200 with same status
  const finishAgainResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/finish`,
    payload: {},
  })
  assert.equal(finishAgainResp.statusCode, 200)
  const finishAgainBody = JSON.parse(finishAgainResp.payload) as { status: string }
  assert.equal(finishAgainBody.status, 'FINISHED')
})
