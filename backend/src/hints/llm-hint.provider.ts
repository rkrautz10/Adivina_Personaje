import OpenAI from 'openai'

import type { HintAttributes, HintLevel, HintProvider } from './hint-provider.js'
import { HintProviderError } from './hint-provider.error.js'

const DEFAULT_TIMEOUT_MS = 3000
const MAX_OUTPUT_WORDS = 25

type ChatCompletionRequest = {
  messages: Array<{ role: 'system' | 'user'; content: string }>
  model: string
  max_tokens: number
  temperature: number
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

export type HintCompletionClient = {
  chat: {
    completions: {
      create: (
        request: ChatCompletionRequest,
        options: { signal: AbortSignal },
      ) => Promise<ChatCompletionResponse>
    }
  }
}

export type LlmHintProviderOptions = {
  apiKey?: string
  model: string
  baseURL?: string
  timeoutMs?: number
  client?: HintCompletionClient
}

function describeRange(value: number | undefined, unit: string): string {
  return value === undefined ? 'no disponible' : `${value} ${unit}`
}

function buildPrompt(attributes: HintAttributes, level: HintLevel): string {
  const types = attributes.types?.slice(0, 2).join(', ') || 'no disponible'
  const ability = attributes.abilities?.[0] || 'no disponible'

  return [
    `Nivel de pista: ${level}.`,
    `Tipos: ${types}.`,
    `Altura: ${describeRange(attributes.height, 'decimetros')}.`,
    `Peso: ${describeRange(attributes.weight, 'hectogramos')}.`,
    `Habilidad: ${ability}.`,
    'Genera una sola frase corta en espanol basada solo en esos datos.',
    'No incluyas nombres de entidades, variantes, traducciones, identificadores ni Markdown.',
  ].join('\n')
}

function validateHint(content: string | null | undefined): string {
  const hint = content?.trim() || ''

  if (!hint || hint.split(/\s+/u).length > MAX_OUTPUT_WORDS || /[*_`#[\]{}<>]/u.test(hint)) {
    throw new HintProviderError('INVALID_OUTPUT', 'LLM returned an invalid hint')
  }

  return hint
}

export class LlmHintProvider implements HintProvider {
  private readonly client?: HintCompletionClient
  private readonly timeoutMs: number

  constructor(private readonly options: LlmHintProviderOptions) {
    const apiKey = options.apiKey
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.client = options.client ?? (apiKey ? createOpenAiClient(apiKey, options.baseURL) : undefined)
  }

  async generateHint(attributes: HintAttributes, level: HintLevel): Promise<string> {
    if (!this.client) {
      throw new HintProviderError('UNAVAILABLE', 'LLM provider is not configured')
    }

    let response: ChatCompletionResponse

    try {
      response = await this.client.chat.completions.create(
        {
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content:
                'Eres un generador de pistas de un juego. No intentes identificar ni revelar la entidad. Responde solo texto plano en espanol.',
            },
            { role: 'user', content: buildPrompt(attributes, level) },
          ],
          max_tokens: 60,
          temperature: 0.2,
        },
        { signal: AbortSignal.timeout(this.timeoutMs) },
      )
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        throw new HintProviderError('TIMEOUT', 'LLM provider timed out')
      }

      throw new HintProviderError('UPSTREAM_FAILURE', 'LLM provider request failed')
    }

    return validateHint(response.choices?.[0]?.message?.content)
  }
}

function createOpenAiClient(apiKey: string, baseURL?: string): HintCompletionClient {
  return new OpenAI({ apiKey, baseURL }) as unknown as HintCompletionClient
}