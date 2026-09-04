export type HintProviderErrorCode = 'UNAVAILABLE' | 'TIMEOUT' | 'UPSTREAM_FAILURE' | 'INVALID_OUTPUT'

export class HintProviderError extends Error {
  constructor(
    public readonly code: HintProviderErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'HintProviderError'
  }
}