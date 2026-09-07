import { AppError } from '../errors/app-error.js'
import type { Character, CharacterProvider } from './character-provider.js'

const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2/pokemon'
const REQUEST_TIMEOUT_MS = 3_000

type PokeApiResponse = {
  id?: number
  name?: string
  sprites?: { other?: { ['official-artwork']?: { front_default?: string | null } } }
  types?: Array<{ type?: { name?: string } }>
  height?: number
  weight?: number
  abilities?: Array<{ ability?: { name?: string } }>
}

export class PokeApiProvider implements CharacterProvider {
  async getCharacter(entityId: number): Promise<Character> {
    let response: Response

    try {
      response = await fetch(`${POKE_API_BASE_URL}/${entityId}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character provider is unavailable')
    }

    if (!response.ok) {
      throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character provider returned an invalid response')
    }

    const payload = (await response.json()) as PokeApiResponse
    const artworkUrl = payload.sprites?.other?.['official-artwork']?.front_default
    const types = payload.types?.map((entry) => entry.type?.name).filter((name): name is string => Boolean(name))
    const abilities = payload.abilities
      ?.map((entry) => entry.ability?.name)
      .filter((name): name is string => Boolean(name))

    if (
      !payload.id ||
      !payload.name ||
      !artworkUrl ||
      payload.height === undefined ||
      payload.weight === undefined ||
      !types?.length ||
      !abilities?.length
    ) {
      throw new AppError(502, 'UPSTREAM_UNAVAILABLE', 'Character provider returned incomplete data')
    }

    return {
      entityId: payload.id,
      name: payload.name,
      artworkUrl,
      attributes: {
        types,
        height: payload.height,
        weight: payload.weight,
        abilities,
      },
    }
  }
}