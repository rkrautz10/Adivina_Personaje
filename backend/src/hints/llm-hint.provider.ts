import OpenAI from 'openai'

import type { HintAttributes, HintLevel, HintProvider } from './hint-provider.js'
import { HintProviderError } from './hint-provider.error.js'

const DEFAULT_TIMEOUT_MS = 8000
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

function describeHeight(height: number): string {
  if (height <= 5) {
    return 'pequeno'
  }

  if (height <= 15) {
    return 'mediano'
  }

  return 'grande'
}

function buildPrompt(attributes: HintAttributes, level: HintLevel, previousHints: string[]): string {
  const allowedValue =
    level === 1 ? attributes.types?.[0] : level === 2 && attributes.height !== undefined ? describeHeight(attributes.height) : attributes.abilities?.[0]
  const history = previousHints.length > 0 ? previousHints.map((hint, index) => `${index + 1}. ${hint}`).join('\n') : 'Ninguna.'

  return [
    `Atributo autorizado: ${level === 1 ? 'tipo' : level === 2 ? 'tamano' : 'habilidad'}.`,
    `Valor verificable: ${allowedValue}.`,
    'Genera una sola frase corta en espanol basada exclusivamente en ese valor verificable.',
    'No menciones otro atributo ni agregues conocimiento externo o inferencias sobre la entidad.',
    'No repitas, reformules, parafrasees, resumas ni infieras informacion de pistas anteriores, aunque uses palabras diferentes.',
    'No uses sinonimos, categorias relacionadas ni descripciones visuales que comuniquen un atributo ya revelado.',
    `Pistas anteriores:\n${history}`,
    'No incluyas nombres de entidades, variantes, traducciones, identificadores ni Markdown.',
    'Si no puedes cumplir todas las reglas, responde exactamente FALLBACK_REQUIRED.',
  ].join('\n')
}

function validateHint(content: string | null | undefined): string {
  const hint = content?.trim() || ''

  if (
    !hint ||
    hint === 'FALLBACK_REQUIRED' ||
    hint.split(/\s+/u).length > MAX_OUTPUT_WORDS ||
    /[*_`#[\]{}<>]/u.test(hint)
  ) {
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

  async generateHint(attributes: HintAttributes, level: HintLevel, previousHints: string[] = []): Promise<string> {
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
            { role: 'user', content: buildPrompt(attributes, level, previousHints) },
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