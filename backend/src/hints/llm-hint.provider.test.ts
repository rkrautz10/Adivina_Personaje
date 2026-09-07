import assert from 'node:assert/strict'
import test from 'node:test'

import { FallbackHintProvider } from './fallback-hint.provider.js'
import { HintProviderError } from './hint-provider.error.js'
import type { HintCompletionClient } from './llm-hint.provider.js'
import { LlmHintProvider } from './llm-hint.provider.js'

function clientReturning(content: string | null): HintCompletionClient {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content } }] }),
      },
    },
  }
}

const attributes = {
  types: ['electric'],
  height: 4,
  weight: 60,
  abilities: ['static'],
}

test('reports unavailable when the provider has no API key', async () => {
  const provider = new LlmHintProvider({ model: 'qwen2.5:3b' })

  await assert.rejects(
    () => provider.generateHint(attributes, 1),
    (error: unknown) => error instanceof HintProviderError && error.code === 'UNAVAILABLE',
  )
})

test('returns a valid short hint', async () => {
  const provider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: clientReturning('Tiene afinidad con la electricidad.'),
  })

  assert.equal(await provider.generateHint(attributes, 1), 'Tiene afinidad con la electricidad.')
})

test('includes previous hints while allowing a single progressive attribute', async () => {
  let requestContent = ''
  const provider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: {
      chat: {
        completions: {
          create: async (request) => {
            requestContent = request.messages[1].content
            return { choices: [{ message: { content: 'Su tamano se encuentra en un rango pequeno.' } }] }
          },
        },
      },
    },
  })

  await provider.generateHint({ height: 4 }, 2, ['Su afinidad principal esta relacionada con el tipo electric.'])

  assert.match(requestContent, /Pistas anteriores:/)
  assert.match(requestContent, /tipo electric/)
  assert.match(requestContent, /Atributo autorizado: tamano/)
  assert.match(requestContent, /Valor verificable: pequeno/)
  assert.match(requestContent, /No repitas, reformules, parafrasees, resumas ni infieras informacion/)
  assert.match(requestContent, /No uses sinonimos, categorias relacionadas ni descripciones visuales/)
  assert.match(requestContent, /FALLBACK_REQUIRED/)
  assert.doesNotMatch(requestContent, /Tipos:|Altura:|Peso:|Habilidad:/)
  assert.doesNotMatch(requestContent, /Habilidad: static/)
})

test('rejects empty and oversized output', async () => {
  const emptyProvider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: clientReturning(''),
  })
  const longProvider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: clientReturning('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis'),
  })
  const fallbackProvider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: clientReturning('FALLBACK_REQUIRED'),
  })

  await assert.rejects(
    () => emptyProvider.generateHint(attributes, 1),
    (error: unknown) => error instanceof HintProviderError && error.code === 'INVALID_OUTPUT',
  )
  await assert.rejects(
    () => longProvider.generateHint(attributes, 1),
    (error: unknown) => error instanceof HintProviderError && error.code === 'INVALID_OUTPUT',
  )
  await assert.rejects(
    () => fallbackProvider.generateHint(attributes, 1),
    (error: unknown) => error instanceof HintProviderError && error.code === 'INVALID_OUTPUT',
  )
})

test('maps a timeout to a typed provider error', async () => {
  const provider = new LlmHintProvider({
    apiKey: 'test-key',
    model: 'test-model',
    client: {
      chat: {
        completions: {
          create: async () => {
            const error = new Error('simulated timeout')
            error.name = 'TimeoutError'
            throw error
          },
        },
      },
    },
  })

  await assert.rejects(
    () => provider.generateHint(attributes, 1),
    (error: unknown) => error instanceof HintProviderError && error.code === 'TIMEOUT',
  )
})

test('keeps the deterministic fallback behavior behind the async contract', async () => {
  const provider = new FallbackHintProvider()

  assert.equal(
    await provider.generateHint(attributes, 1),
    'Su afinidad principal esta relacionada con el tipo electric.',
  )
})