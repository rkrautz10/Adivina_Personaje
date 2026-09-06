import assert from 'node:assert/strict'
import test from 'node:test'

import { buildApp } from '../app.js'

test('Round creation, images, hints and guess resolution flow', async () => {
  const app = await buildApp()
  const uniqueAlias = `Rnd_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`

  // 1. Create match
  const createMatchResp = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: uniqueAlias, gameMode: 'STANDARD' },
  })
  assert.equal(createMatchResp.statusCode, 201)
  const match = JSON.parse(createMatchResp.payload) as { matchId: string }

  // 2. Create first round
  const createRoundResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/rounds`,
    payload: {},
  })
  assert.equal(createRoundResp.statusCode, 201)
  const round = JSON.parse(createRoundResp.payload) as {
    roundId: string
    roundNumber: number
    imageUrl: string
    obfuscationLevel: string
    timeLimitMs: number
    difficultyLevel: string
  }
  assert.ok(round.roundId)
  assert.equal(round.roundNumber, 1)
  assert.equal(round.obfuscationLevel, 'HIGH')
  assert.equal(round.timeLimitMs, 30000)

  // 3. Attempting to create second active round returns 409
  const secondRoundResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/rounds`,
    payload: {},
  })
  assert.equal(secondRoundResp.statusCode, 409)

  // 4. GET image while active returns 200 image/png
  const activeImageResp = await app.inject({
    method: 'GET',
    url: `/rounds/${round.roundId}/image`,
  })
  assert.equal(activeImageResp.statusCode, 200)
  assert.equal(activeImageResp.headers['content-type'], 'image/png')

  // 5. Request hints up to 3 times
  for (let i = 1; i <= 3; i += 1) {
    const hintResp = await app.inject({
      method: 'POST',
      url: `/rounds/${round.roundId}/hints`,
      payload: {},
    })
    assert.equal(hintResp.statusCode, 200)
    const hintBody = JSON.parse(hintResp.payload) as {
      hint: string
      hintsUsed: number
      remainingHints: number
    }
    assert.ok(hintBody.hint)
    assert.equal(hintBody.hintsUsed, i)
    assert.equal(hintBody.remainingHints, 3 - i)
  }

  // 6. Requesting 4th hint returns 409
  const fourthHintResp = await app.inject({
    method: 'POST',
    url: `/rounds/${round.roundId}/hints`,
    payload: {},
  })
  assert.equal(fourthHintResp.statusCode, 409)

  // 7. Resolve guess
  const guessResp = await app.inject({
    method: 'POST',
    url: `/rounds/${round.roundId}/guess`,
    payload: { guess: 'some_incorrect_guess' },
  })
  assert.equal(guessResp.statusCode, 200)
  const guessBody = JSON.parse(guessResp.payload) as {
    correct: boolean
    revealedName: string
    scoreDelta: number
    totalScore: number
    currentStreak: number
    roundStatus: string
    matchStatus: string
    gameMode: string
  }
  assert.equal(guessBody.correct, false)
  assert.ok(guessBody.revealedName)
  assert.equal(guessBody.scoreDelta, 0)
  assert.equal(guessBody.roundStatus, 'RESOLVED')
  assert.equal(guessBody.matchStatus, 'IN_PROGRESS')
  assert.equal(guessBody.gameMode, 'STANDARD')

  // 8. GET image when RESOLVED returns 200
  const resolvedImageResp = await app.inject({
    method: 'GET',
    url: `/rounds/${round.roundId}/image`,
  })
  assert.equal(resolvedImageResp.statusCode, 200)
})

test('STREAK mode auto-finishes match on incorrect guess', async () => {
  const app = await buildApp()
  const uniqueAlias = `Strk_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`

  // 1. Create match in STREAK mode
  const createMatchResp = await app.inject({
    method: 'POST',
    url: '/matches',
    payload: { alias: uniqueAlias, gameMode: 'STREAK' },
  })
  assert.equal(createMatchResp.statusCode, 201)
  const match = JSON.parse(createMatchResp.payload) as { matchId: string }

  // 2. Create round
  const roundResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/rounds`,
    payload: {},
  })
  assert.equal(roundResp.statusCode, 201)
  const round = JSON.parse(roundResp.payload) as { roundId: string }

  // 3. Submit wrong guess -> auto finishes match
  const guessResp = await app.inject({
    method: 'POST',
    url: `/rounds/${round.roundId}/guess`,
    payload: { guess: 'wrong_guess' },
  })
  assert.equal(guessResp.statusCode, 200)
  const guessBody = JSON.parse(guessResp.payload) as {
    correct: boolean
    matchStatus: string
    gameMode: string
  }
  assert.equal(guessBody.correct, false)
  assert.equal(guessBody.matchStatus, 'FINISHED')
  assert.equal(guessBody.gameMode, 'STREAK')

  // 4. Attempting to create new round on finished match returns 409
  const nextRoundResp = await app.inject({
    method: 'POST',
    url: `/matches/${match.matchId}/rounds`,
    payload: {},
  })
  assert.equal(nextRoundResp.statusCode, 409)
})
