# Flujo del juego - Adivina Personaje

Este documento describe el flujo completo del juego, de inicio a fin, y se
actualiza si el diseno cambia durante el desarrollo.

## Flujo end-to-end de una partida

```text
                ┌────────────────────────────┐
                │ Crear partida              │
                │ alias + modo               │
                └──────────────┬─────────────┘
                               │
                ┌──────────────┴─────────────┐
                ▼                            ▼
        ┌────────────────────┐      ┌────────────────────┐
        │ STANDARD           │      │ STREAK             │
        │ hasta 10 rondas    │      │ hasta primer fallo │
        └─────────┬──────────┘      └─────────┬──────────┘
                  └──────────────┬────────────┘
                                 ▼
                  ┌────────────────────────────┐
                  │ Crear ronda                │
                  │ imagen obfuscada           │
                  │ desde backend              │
                  └──────────────┬─────────────┘
                                 ▼
                  ┌────────────────────────────┐
                  │ Adivinar o pedir hasta     │
                  │ 3 pistas: LLM -> fallback  │
                  └──────────────┬─────────────┘
                                 ▼
                  ┌────────────────────────────┐
                  │ Resolver ronda             │
                  │ revelar y puntuar          │
                  └──────────────┬─────────────┘
                                 ▼
                  ┌────────────────────────────┐
                  │ Ajustar dificultad y       │
                  │ persistir estado           │
                  └──────────────┬─────────────┘
                                 │
                  ┌──────────────┴─────────────┐
                  ▼                            ▼
        ┌────────────────────┐      ┌────────────────────────┐
        │ Continuar siguiente│      │ Finalizar y mostrar    │
        │ ronda según el modo│      │ puntaje y ranking      │
        └──────────┬─────────┘      └────────────────────────┘
                   │
                   └────────────── vuelve a Crear ronda

Abandono: si una ronda supera 3 minutos, se marca EXPIRED y finaliza la partida.
```

Version equivalente en Mermaid, util para exportar o versionar el diagrama:

```mermaid
sequenceDiagram
    participant Jugador
    participant Frontend
    participant Backend
    participant PokeAPI
    participant DB as PostgreSQL

    Jugador->>Frontend: Ingresa alias
    Jugador->>Frontend: Selecciona STANDARD o STREAK
    Frontend->>Backend: POST /matches { alias, mode }
    Backend->>DB: upsert Player + create Match (IN_PROGRESS)
    Backend-->>Frontend: matchId, mode, status, difficultyLevel

    loop Mientras el modo permita continuar
        Frontend->>Backend: POST /matches/:matchId/rounds
        Backend->>DB: buscar cache de entidad
        alt cache invalida o inexistente
            Backend->>PokeAPI: GET /pokemon/:id (timeout 3s)
            PokeAPI-->>Backend: datos crudos
            Backend->>DB: guardar EntityCache (TTL 24h)
        end
        Backend->>DB: crear Round (ACTIVE)
        Backend->>Backend: generar imagen obfuscada server-side
        Backend-->>Frontend: roundId, imagen obfuscada, bonusLimitMs=30000

        Frontend->>Backend: GET /rounds/:roundId/image
        Backend-->>Frontend: imagen obfuscada sin artwork original

        opt hasta 3 pistas
            Frontend->>Backend: POST /rounds/:roundId/hints
            Backend->>Backend: intenta LlmHintProvider
            alt LLM responde valido
                Backend-->>Frontend: pista LLM
            else error, timeout, spoiler o salida invalida
                Backend->>Backend: usa FallbackHintProvider
                Backend-->>Frontend: pista fallback
            end
            Backend->>DB: incrementar hintsUsed y persistir Round.hints
        end

        Frontend->>Backend: POST /rounds/:roundId/guess { guess }
        Backend->>Backend: normaliza y compara contra entityName
        Backend->>DB: transaccion: resolver Round + actualizar Match
        Backend-->>Frontend: correct, revealedName, scoreDelta, totalScore
        Note over Backend: 30 s limita el bonus y mas de 3 min marca EXPIRED, finaliza la partida, verifica abandono antes de continuar y recalcula dificultad segun rondas recientes

        alt STANDARD y rondas menores que 10
            Backend-->>Frontend: continuar con la siguiente ronda
        else STREAK y guess correcto
            Backend-->>Frontend: continuar con la siguiente ronda
        else STREAK y guess incorrecto o abandono
            Backend-->>Frontend: finalizar partida
        else STANDARD y ronda 10 o decision del jugador
            Backend-->>Frontend: finalizar partida
        end
    end

    Frontend->>Backend: POST /matches/:matchId/finish
    Backend->>DB: transaccion: FINISHED si no hay ronda ACTIVE
    Backend-->>Frontend: status FINISHED, totalScore, roundsPlayed
```

## Maquina de estados de una ronda

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: POST /matches/:matchId/rounds
    ACTIVE --> RESOLVED: POST /rounds/:roundId/guess
    RESOLVED --> [*]
    ACTIVE --> EXPIRED: abandono (> 3 min sin resolver)
    EXPIRED --> [*]
```

Reglas vigentes:

- Solo puede existir una ronda `ACTIVE` por partida (garantizado por indice
  unico parcial en PostgreSQL).
- Una ronda `RESOLVED` no puede volver a puntuar: una segunda conjetura
  responde `409 / CONFLICT`.
- Una ronda que supera 3 minutos sin resolverse se marca `EXPIRED` con
  puntaje 0 y racha reiniciada, y la partida se finaliza en la misma
  transaccion (ver ADR-08 en `DECISIONS.md`). El limite de tiempo por
  dificultad (`timeLimitMs`) sigue siendo independiente: solo afecta el
  bonus de velocidad del puntaje.

## Maquina de estados de una partida

```mermaid
stateDiagram-v2
    [*] --> IN_PROGRESS: POST /matches
    IN_PROGRESS --> FINISHED: POST /matches/:matchId/finish (sin ronda ACTIVE)
    IN_PROGRESS --> IN_PROGRESS: POST /matches/:matchId/finish (con ronda ACTIVE -> 409)
    FINISHED --> FINISHED: POST /matches/:matchId/finish (idempotente, 200)
```

## Calculo de puntaje (G3)

```mermaid
flowchart TD
    A[Recibe guess] --> B{Normalizado == entityName normalizado?}
    B -- No --> C["scoreDelta = 0, streak = 0"]
    B -- Si --> D[speedBonus segun tiempo transcurrido]
    D --> E["Penalizacion = 15 x hintsUsed"]
    E --> F["Multiplicador = 1 + 0.1 x min(streak, 5)"]
    F --> G["scoreDelta = max(0, (100 + speedBonus - penalizacion) x multiplicador)"]
    C --> H[Persistir Round RESOLVED + actualizar Match]
    G --> H
```

## Generacion de pistas

```mermaid
flowchart LR
    Attrs[Atributos de EntityCache] --> Provider[HintProvider]
    Provider --> LLM[LlmHintProvider]
    LLM -. si falla o hace timeout .-> Fallback
    Fallback --> Level1[Nivel 1: tipo]
    Fallback --> Level2[Nivel 2: rango de tamano]
    Fallback --> Level3[Nivel 3: habilidad]
    LLM --> Endpoint[POST /rounds/:roundId/hints]
    Fallback --> Endpoint
```

Ni el fallback ni el LLM reciben el nombre ni el ID de la entidad, por lo
que no pueden revelarlos. El endpoint de pistas controla el limite de tres
por ronda y persiste cada pista generada en `Round.hints`.

## Orden de implementacion aprobado

El cierre del bucle se ejecuta en este orden para mantener las dependencias
controladas:

1. I3 implementa pistas, fallback, limite de tres, persistencia, penalizacion
    y expiracion reutilizable.
2. G2 recibe la correccion para entregar la imagen obfuscada desde backend.
3. Una HU tecnica agrega los modos `STANDARD` (10 rondas) y `STREAK` (hasta
    el primer fallo), con su migracion.
4. D1 implementa dificultad adaptativa.
5. U1 permite elegir el modo al iniciar.
6. U2 representa la ronda completa, sus dos relojes, pistas y expiracion.
7. U3 muestra resultado, puntaje persistido y ranking.
8. Q1/Q2 validan dominio, integracion y flujo completo.
9. X1 consolida ADRs, flujo, README y bitacora.

Los dos relojes son independientes: 30 segundos limitan el bonus de velocidad
y 3 minutos determinan abandono. La formula vigente de G3 se mantiene; la
alternativa de puntos base 100/50/20 no forma parte de este alcance.
