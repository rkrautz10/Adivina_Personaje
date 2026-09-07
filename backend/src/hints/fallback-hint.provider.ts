import type { HintAttributes, HintLevel, HintProvider } from './hint-provider.js'

function describeHeight(height: number): string {
  if (height <= 5) {
    return 'pequeno'
  }

  if (height <= 15) {
    return 'mediano'
  }

  return 'grande'
}

export class FallbackHintProvider implements HintProvider {
  async generateHint(attributes: HintAttributes, level: HintLevel, _previousHints: string[] = []): Promise<string> {
    switch (level) {
      case 1:
        return attributes.types?.[0]
          ? `Su afinidad principal esta relacionada con el tipo ${attributes.types[0]}.`
          : 'No hay informacion adicional verificable para esta pista.'
      case 2:
        return attributes.height !== undefined
          ? `Su tamano se encuentra en un rango ${describeHeight(attributes.height)}.`
          : 'No hay informacion adicional verificable para esta pista.'
      case 3:
        return attributes.abilities?.[0]
          ? `Posee una habilidad especial llamada ${attributes.abilities[0]}.`
          : 'No hay informacion adicional verificable para esta pista.'
    }
  }
}