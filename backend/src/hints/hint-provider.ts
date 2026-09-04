export type HintLevel = 1 | 2 | 3

export type HintAttributes = {
  types?: string[]
  height?: number
  weight?: number
  abilities?: string[]
}

export interface HintProvider {
  generateHint(attributes: HintAttributes, level: HintLevel): Promise<string>
}