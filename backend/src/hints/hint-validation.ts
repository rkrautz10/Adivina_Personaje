import { normalizeText } from '../utils/normalize-text.js'

export function containsSpoiler(hint: string, entityName: string): boolean {
  return normalizeText(hint).includes(normalizeText(entityName))
}