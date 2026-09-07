import assert from 'node:assert/strict'
import test from 'node:test'

import { containsSpoiler } from './hint-validation.js'

test('detects an entity name despite case and accents', () => {
  assert.equal(containsSpoiler('Una pista menciona Pokémon.', 'Pokemon'), true)
})

test('accepts a hint that does not contain the entity name', () => {
  assert.equal(containsSpoiler('Tiene afinidad con la electricidad.', 'Pikachu'), false)
})