import { useEffect, useRef, useState } from 'react'
import './App.css'

type GameMode = 'STANDARD' | 'STREAK'

type MatchResponse = {
  matchId: string
  playerId: string
  alias: string
  status: 'IN_PROGRESS'
  gameMode: GameMode
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD'
  totalScore: number
  startedAt: string
}

type ErrorResponse = { message?: string }

type RoundResponse = {
  roundId: string
  roundNumber: number
  imageUrl: string
  obfuscationLevel: 'HIGH'
  timeLimitMs: number
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD'
}

type HintResponse = {
  hint: string
  hintsUsed: number
  remainingHints: number
}

type GuessResponse = {
  correct: boolean
  revealedName: string
  scoreDelta: number
  totalScore: number
  currentStreak: number
  roundStatus: 'RESOLVED'
  matchStatus: 'IN_PROGRESS' | 'FINISHED'
  gameMode: GameMode
}

type FinishedMatchResponse = {
  matchId: string
  status: 'FINISHED'
  totalScore: number
  roundsPlayed: number
  finishedAt: string
}

type RankingEntry = {
  position: number
  alias: string
  totalScore: number
  gameMode: GameMode
  roundsPlayed: number
  finishedAt: string
}

type RankingResponse = { entries: RankingEntry[] }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const aliasPattern = /^[\p{L}\p{N}_ -]+$/u

function App() {
  const [alias, setAlias] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('STANDARD')
  const [match, setMatch] = useState<MatchResponse | null>(null)
  const [round, setRound] = useState<RoundResponse | null>(null)
  const [hints, setHints] = useState<string[]>([])
  const [guess, setGuess] = useState('')
  const [result, setResult] = useState<GuessResponse | null>(null)
  const [finishedMatch, setFinishedMatch] = useState<FinishedMatchResponse | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingRound, setIsLoadingRound] = useState(false)
  const [isLoadingHint, setIsLoadingHint] = useState(false)
  const [isResolvingGuess, setIsResolvingGuess] = useState(false)
  const [isFinishingMatch, setIsFinishingMatch] = useState(false)
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const imageObjectUrl = useRef<string | null>(null)

  function setSafeError(message: string) {
    setError(message)
  }

  function isConflict(response: Response, payload: ErrorResponse): boolean {
    return response.status === 409 && Boolean(payload.message)
  }

  async function readImage(roundId: string) {
    const response = await fetch(`${API_URL}/rounds/${roundId}/image`)
    if (!response.ok) {
      const payload = (await response.json()) as ErrorResponse
      if (isConflict(response, payload)) {
        setIsExpired(true)
      }
      throw new Error(payload.message ?? 'No fue posible cargar la imagen de la ronda.')
    }

    const image = await response.blob()
    const nextObjectUrl = URL.createObjectURL(image)
    if (imageObjectUrl.current) {
      URL.revokeObjectURL(imageObjectUrl.current)
    }
    imageObjectUrl.current = nextObjectUrl
    setImageUrl(nextObjectUrl)
  }

  async function createRound(matchId: string) {
    setIsLoadingRound(true)
    setError(null)
    setResult(null)
    setFinishedMatch(null)
    setHints([])
    setGuess('')
    setIsExpired(false)

    try {
      const response = await fetch(`${API_URL}/matches/${matchId}/rounds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const payload = (await response.json()) as RoundResponse | ErrorResponse
      if (!response.ok) {
        if (isConflict(response, payload as ErrorResponse)) {
          setIsExpired(true)
        }
        throw new Error('message' in payload && payload.message ? payload.message : 'No fue posible crear la ronda.')
      }

      const nextRound = payload as RoundResponse
      setRound(nextRound)
      setSecondsRemaining(Math.ceil(nextRound.timeLimitMs / 1000))
      await readImage(nextRound.roundId)
    } catch (requestError) {
      setSafeError(requestError instanceof Error ? requestError.message : 'No fue posible crear la ronda.')
    } finally {
      setIsLoadingRound(false)
    }
  }

  useEffect(() => {
    if (!round || result || isExpired || secondsRemaining === 0) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [round, result, isExpired, secondsRemaining])

  useEffect(() => () => {
    if (imageObjectUrl.current) {
      URL.revokeObjectURL(imageObjectUrl.current)
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedAlias = alias.trim()

    if (normalizedAlias.length < 3 || normalizedAlias.length > 30 || !aliasPattern.test(normalizedAlias)) {
      setError('Ingresa un alias de 3 a 30 caracteres usando letras, numeros, espacios, guion o guion bajo.')
      return
    }

    setError(null)
    setMatch(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alias: normalizedAlias, gameMode }),
      })
      const payload = (await response.json()) as MatchResponse | ErrorResponse

      if (!response.ok) {
        setError('message' in payload && payload.message ? payload.message : 'No fue posible crear la partida.')
        return
      }

      const createdMatch = payload as MatchResponse
      setMatch(createdMatch)
      await createRound(createdMatch.matchId)
    } catch {
      setError('No fue posible conectar con el servidor. Verifica que el backend este disponible.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleHint() {
    if (!round) {
      return
    }

    setIsLoadingHint(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/rounds/${round.roundId}/hints`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const payload = (await response.json()) as HintResponse | ErrorResponse
      if (!response.ok) {
        if (isConflict(response, payload as ErrorResponse)) {
          setIsExpired(true)
        }
        throw new Error('message' in payload && payload.message ? payload.message : 'No fue posible solicitar una pista.')
      }

      setHints((current) => [...current, (payload as HintResponse).hint])
    } catch (requestError) {
      setSafeError(requestError instanceof Error ? requestError.message : 'No fue posible solicitar una pista.')
    } finally {
      setIsLoadingHint(false)
    }
  }

  async function handleGuess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!round || !guess.trim()) {
      setSafeError('Ingresa una respuesta antes de enviar la conjetura.')
      return
    }

    setIsResolvingGuess(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/rounds/${round.roundId}/guess`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ guess: guess.trim() }),
      })
      const payload = (await response.json()) as GuessResponse | ErrorResponse
      if (!response.ok) {
        if (isConflict(response, payload as ErrorResponse)) {
          setIsExpired(true)
        }
        throw new Error('message' in payload && payload.message ? payload.message : 'No fue posible resolver la ronda.')
      }

      const resolvedRound = payload as GuessResponse
      setResult(resolvedRound)
      await readImage(round.roundId)
      if (resolvedRound.matchStatus === 'FINISHED') {
        await loadRanking()
      }
    } catch (requestError) {
      setSafeError(requestError instanceof Error ? requestError.message : 'No fue posible resolver la ronda.')
    } finally {
      setIsResolvingGuess(false)
    }
  }

  async function loadRanking() {
    setIsLoadingRanking(true)
    try {
      const response = await fetch(`${API_URL}/ranking?limit=10`)
      const payload = (await response.json()) as RankingResponse | ErrorResponse
      if (!response.ok) {
        throw new Error('message' in payload && payload.message ? payload.message : 'No fue posible cargar el ranking.')
      }
      setRanking((payload as RankingResponse).entries)
    } catch (requestError) {
      setSafeError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el ranking.')
    } finally {
      setIsLoadingRanking(false)
    }
  }

  async function handleFinishMatch() {
    if (!match) {
      return
    }

    setIsFinishingMatch(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/matches/${match.matchId}/finish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const payload = (await response.json()) as FinishedMatchResponse | ErrorResponse
      if (!response.ok) {
        throw new Error('message' in payload && payload.message ? payload.message : 'No fue posible finalizar la partida.')
      }
      setFinishedMatch(payload as FinishedMatchResponse)
      await loadRanking()
    } catch (requestError) {
      setSafeError(requestError instanceof Error ? requestError.message : 'No fue posible finalizar la partida.')
    } finally {
      setIsFinishingMatch(false)
    }
  }

  function handleNewMatch() {
    if (imageObjectUrl.current) {
      URL.revokeObjectURL(imageObjectUrl.current)
      imageObjectUrl.current = null
    }
    setMatch(null)
    setRound(null)
    setHints([])
    setGuess('')
    setResult(null)
    setFinishedMatch(null)
    setRanking(null)
    setImageUrl(null)
    setSecondsRemaining(30)
    setIsExpired(false)
    setError(null)
  }

  return (
    <main className="game-shell">
      <header className="masthead">
        <span className="brand-mark" aria-hidden="true">?</span>
        <div>
          <p className="eyebrow">Archivo de criaturas</p>
          <h1>Adivina Personaje</h1>
        </div>
        <span className="session-label">Nueva partida</span>
      </header>

      <section className="setup" aria-labelledby="setup-title">
        <div className="setup-intro">
          <p className="step">01 / Preparar exploracion</p>
          <h2 id="setup-title">Define tu partida</h2>
          <p>Elige un modo y registra tu alias. Las reglas y el puntaje se controlan desde el servidor.</p>
        </div>

        <form className="setup-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="alias">Alias de explorador</label>
          <input id="alias" name="alias" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Ej. Ash" autoComplete="nickname" maxLength={30} disabled={isSubmitting} />

          <fieldset disabled={isSubmitting}>
            <legend>Modo de partida</legend>
            <div className="mode-grid">
              <label className={gameMode === 'STANDARD' ? 'mode-option selected' : 'mode-option'}>
                <input type="radio" name="gameMode" value="STANDARD" checked={gameMode === 'STANDARD'} onChange={() => setGameMode('STANDARD')} />
                <span>STANDARD</span><small>Hasta 10 rondas</small>
              </label>
              <label className={gameMode === 'STREAK' ? 'mode-option selected' : 'mode-option'}>
                <input type="radio" name="gameMode" value="STREAK" checked={gameMode === 'STREAK'} onChange={() => setGameMode('STREAK')} />
                <span>STREAK</span><small>Hasta el primer fallo</small>
              </label>
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando partida...' : 'Iniciar partida'}</button>
        </form>
      </section>

      {match && (
        <section className="round-screen" aria-live="polite">
          <header className="round-header">
            <div><p className="step">Partida de {match.alias}</p><h2>Ronda {round?.roundNumber ?? '-'}</h2></div>
            <dl><div><dt>Modo</dt><dd>{match.gameMode}</dd></div><div><dt>Dificultad</dt><dd>{round?.difficultyLevel ?? match.difficultyLevel}</dd></div></dl>
          </header>

          {isLoadingRound && <p className="round-status">Preparando entidad oculta...</p>}
          {isExpired && <p className="round-status expired" role="alert">La ronda ya no esta disponible. La partida fue finalizada por el servidor.</p>}
          {round && !isExpired && (
            <div className="round-layout">
              <section className="entity-panel" aria-label="Entidad oculta">
                <div className="timer"><span>Bonus de velocidad</span><strong>{secondsRemaining > 0 ? `${secondsRemaining}s` : 'Sin bonus'}</strong></div>
                <div className="image-stage">{imageUrl ? <img src={imageUrl} alt={result ? `Entidad revelada: ${result.revealedName}` : 'Entidad oculta para adivinar'} /> : <span>Cargando imagen...</span>}</div>
              </section>

              <section className="play-panel">
                <div className="hint-section">
                  <div className="section-heading"><h3>Pistas</h3><span>{3 - hints.length} disponibles</span></div>
                  {hints.length > 0 && <ol className="hint-list">{hints.map((hint, index) => <li key={`${index}-${hint}`}>{hint}</li>)}</ol>}
                  <button type="button" className="secondary-action" onClick={handleHint} disabled={isLoadingHint || isResolvingGuess || Boolean(result) || hints.length >= 3}>{isLoadingHint ? 'Buscando pista...' : 'Solicitar pista'}</button>
                </div>

                <form className="guess-form" onSubmit={handleGuess}>
                  <label htmlFor="guess">Tu conjetura</label>
                  <input id="guess" value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="Nombre del personaje" disabled={isResolvingGuess || Boolean(result)} />
                  <button type="submit" disabled={isResolvingGuess || isLoadingHint || Boolean(result)}>{isResolvingGuess ? 'Resolviendo...' : 'Responder'}</button>
                </form>

                {result && <div className={result.correct ? 'round-result correct' : 'round-result incorrect'}><p>{result.correct ? 'Acierto confirmado' : 'Ronda resuelta'}</p><h3>{result.revealedName}</h3><dl><div><dt>Puntaje</dt><dd>{result.scoreDelta}</dd></div><div><dt>Racha</dt><dd>{result.currentStreak}</dd></div><div><dt>Partida</dt><dd>{result.matchStatus}</dd></div></dl></div>}
                {result?.matchStatus === 'IN_PROGRESS' && <div className="round-actions"><button type="button" onClick={() => createRound(match.matchId)} disabled={isLoadingRound || isFinishingMatch}>Siguiente ronda</button><button type="button" className="secondary-action" onClick={handleFinishMatch} disabled={isFinishingMatch || isLoadingRound}>{isFinishingMatch ? 'Finalizando...' : 'Finalizar partida'}</button></div>}
              </section>
            </div>
          )}
        </section>
      )}
      {match && (result?.matchStatus === 'FINISHED' || finishedMatch) && <section className="final-screen" aria-live="polite"><p className="step">Partida finalizada</p><h2>{match.alias}, registro completado</h2><p className="final-score">Puntaje total: <strong>{finishedMatch?.totalScore ?? result?.totalScore ?? 0}</strong></p><div className="ranking"><div className="section-heading"><h3>Ranking</h3><span>Partidas finalizadas</span></div>{isLoadingRanking && <p>Cargando ranking...</p>}{ranking?.length === 0 && <p>Aun no hay partidas finalizadas.</p>}{ranking && ranking.length > 0 && <ol>{ranking.map((entry) => <li key={`${entry.position}-${entry.alias}-${entry.finishedAt}`}><strong>#{entry.position}</strong><span>{entry.alias}</span><span>{entry.totalScore} pts</span><small>{entry.gameMode} / {entry.roundsPlayed} rondas</small></li>)}</ol>}</div><button type="button" onClick={handleNewMatch}>Nueva partida</button></section>}
    </main>
  )
}

export default App
