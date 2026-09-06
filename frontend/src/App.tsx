import { useState } from 'react'
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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const aliasPattern = /^[\p{L}\p{N}_ -]+$/u

function App() {
  const [alias, setAlias] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('STANDARD')
  const [match, setMatch] = useState<MatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      setMatch(payload as MatchResponse)
    } catch {
      setError('No fue posible conectar con el servidor. Verifica que el backend este disponible.')
    } finally {
      setIsSubmitting(false)
    }
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
        <section className="match-ready" aria-live="polite">
          <p className="step">Partida registrada</p>
          <h2>Todo listo, {match.alias}</h2>
          <dl>
            <div><dt>Modo</dt><dd>{match.gameMode}</dd></div>
            <div><dt>Dificultad</dt><dd>{match.difficultyLevel}</dd></div>
            <div><dt>Estado</dt><dd>{match.status}</dd></div>
          </dl>
          <p className="match-id">ID de partida: {match.matchId}</p>
        </section>
      )}
    </main>
  )
}

export default App
