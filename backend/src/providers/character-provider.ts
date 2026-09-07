export type CharacterAttributes = {
  types: string[]
  height: number
  weight: number
  abilities: string[]
}

export type Character = {
  entityId: number
  name: string
  artworkUrl: string
  attributes: CharacterAttributes
}

export interface CharacterProvider {
  getCharacter(entityId: number): Promise<Character>
}