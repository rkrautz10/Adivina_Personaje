import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeText } from './normalize-text.js'

test('trims whitespace around text', () => {
  assert.equal(normalizeText('  pikachu  '), 'pikachu')
})

test('converts uppercase characters to lowercase', () => {
  assert.equal(normalizeText('CHARIZARD'), 'charizard')
})

test('removes accents and diacritics', () => {
  assert.equal(normalizeText('Píkachù'), 'pikachu')
  assert.equal(normalizeText('SQUIRTLE'), 'squirtle')
  assert.equal(normalizeText('ÁÉÍÓÚáéíóúñ'), 'aeiouaeioun')
})

test('handles combined case, spaces, and accents', () => {
  assert.equal(normalizeText('  Bulbasáur  '), 'bulbasaur')
})
