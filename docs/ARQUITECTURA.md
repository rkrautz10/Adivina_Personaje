# Arquitectura - Adivina Personaje

Estado: refleja lo implementado hasta las HU F1-F3, G1-G4 e I1 (fallback de pistas).
I2 (LLM) e I3 (endpoint de pistas) aun no estan implementadas.

## Estilo arquitectonico

Monolito modular. Un unico backend Node.js/TypeScript con capas separadas por
responsabilidad, sin microservicios: el equipo es de una persona y el dominio
es pequeno, por lo que separar por red anadiria complejidad sin beneficio real.

## Diagrama de componentes

```text
                    ┌────────────────────┐
                    │      Frontend      │
                    │ React + TypeScript │
                    └─────────┬──────────┘
                              │
                         HTTP / REST
                              │
                    ┌─────────▼────────────┐
                    │      Backend         │
                    │  Fastify (monolito)  │
                    ├──────────────────────┤
                    │ Player               │
                    │ Match                │
                    │ Round                │
                    │ EntityCache          │
                    │ Scoring              │
                    │ Hint (fallback)      │
                    │ Hint LLM   (I2, WIP) │
                    │ Difficulty (D1, WIP) │
                    │ Ranking    (X1, WIP) │
                    └─────┬────────┬───────┘
                          │        │
                ┌─────────▼───┐ ┌──▼──────────────┐
                │ PostgreSQL  │ │  AI Provider    │
                │             │ │  (I2, pendiente)│
                └─────────────┘ └─────────────────┘
                          │
                    ┌─────▼──────┐
                    │  PokeAPI   │
                    └────────────┘
```

Los modulos marcados `(WIP)` o `(pendiente)` estan definidos en el diseno
pero no tienen codigo todavia; se documentan aqui para mostrar donde
encajaran sin implicar que ya funcionan.

Version equivalente en Mermaid, util para exportar o versionar el diagrama:

```mermaid
flowchart LR
  UI[Frontend React + Vite] -->|HTTP JSON| API[Backend Fastify]

  subgraph Backend
    API --> Routes[routes: matches, rounds]
    Routes --> Services[services: match, round, scoring, hints]
    Services --> Repos[repositories Prisma]
    Services --> Providers[providers externos]
  end

  Repos --> DB[(PostgreSQL)]
  Providers --> PokeAPI[PokeAPI]
  Providers -. futuro I2 .-> LLM[Proveedor LLM]
```

## Capas del backend

- `routes/*.routes.ts`: define endpoints Fastify, valida entrada con Zod via
  `validateRequest` y delega en los servicios. No contiene reglas de negocio.
- `*/*.service.ts`: logica de negocio y orquestacion. Es la unica capa que
  decide resultados, puntaje, estados y transiciones.
- `*/*.repository.ts`: acceso a datos con Prisma Client. Sin logica de negocio.
- `players/`: repositorio de jugadores; crea o reutiliza un `Player` por
  `normalizedAlias` (evita duplicados por mayusculas/espacios).
- `entities/`: repositorio de `EntityCache`; busca cache vigente por TTL y
  guarda los atributos normalizados obtenidos de PokeAPI.
- `providers/`: integraciones externas (PokeAPI). Encapsuladas detras de una
  interfaz (`CharacterProvider`) para poder sustituirlas sin tocar el dominio.
- `hints/`: contrato `HintProvider` y su implementacion `FallbackHintProvider`,
  deterministica y sin red. Preparada para admitir un proveedor LLM (I2) que
  implemente el mismo contrato.
- `errors/`: `AppError` tipado y un manejador central Fastify que traduce
  errores de dominio, Zod y errores nativos de Fastify a un contrato JSON
  unico.
- `config/env.ts`: validacion de variables de entorno con Zod. Falla temprano
  si falta `DATABASE_URL` o `FRONTEND_ORIGIN`.
- `database/prisma.ts`: instancia unica de Prisma Client compartida por toda
  la aplicacion.

## Autoridad del servidor

El cliente nunca envia puntaje, tiempo transcurrido, resultado de una ronda o
racha. El backend siempre calcula estos valores a partir de:

- `Round.startedAt` y el reloj del servidor, para el tiempo transcurrido.
- El nombre real de la entidad (`Round.entityName`), nunca expuesto antes de
  resolver la ronda.
- `Match.currentStreak` y `Match.totalScore`, actualizados solo dentro de
  transacciones Prisma.

## Persistencia

PostgreSQL gestionado con Docker Compose en desarrollo. El esquema se
versiona con migraciones Prisma. Entidades principales:

- `Player`: alias visible y `normalizedAlias` unico para evitar duplicados
  por mayusculas o espacios.
- `Match`: estado de partida, dificultad, racha y puntaje total.
- `Round`: ronda de una partida, entidad oculta, estado, pistas usadas y
  resultado.
- `EntityCache`: cache de atributos de PokeAPI con expiracion (TTL 24h), para
  reducir llamadas externas y servir de fuente de datos a las pistas.

Restricciones relevantes a nivel de base de datos:

- Indice unico parcial: una partida no puede tener mas de una ronda `ACTIVE`
  a la vez.
- Clave foranea `Round.entityId -> EntityCache.entityId`.
- Indice unico `Round(matchId, roundNumber)`.

## Concurrencia e idempotencia

Las operaciones que cambian estado (resolver una conjetura, finalizar una
partida) se ejecutan dentro de transacciones Prisma con aislamiento
`Serializable` y actualizaciones condicionadas por estado (`updateMany` con
filtro de estado esperado). Esto evita:

- Puntuar dos veces la misma ronda ante solicitudes concurrentes.
- Sobrescribir el resultado de una partida ya finalizada.

## Seguridad

- Secretos (`DATABASE_URL`, `AI_API_KEY`) solo en archivos `.env` locales,
  ignorados por Git; `.env.example` documenta las variables sin valores
  reales.
- El backend nunca expone el nombre real de una entidad antes de resolver la
  ronda; la imagen se sirve mediante un proxy propio
  (`GET /rounds/:roundId/image`) para no filtrar el identificador externo de
  PokeAPI.
- Los errores devueltos al cliente siguen un contrato fijo
  (`statusCode`, `code`, `message`) sin stack traces ni detalles internos.

## Resiliencia ante servicios externos

- Llamadas a PokeAPI con timeout de 3 segundos; los fallos se traducen a
  `502 / UPSTREAM_UNAVAILABLE`.
- Cache de entidades para reducir dependencia de PokeAPI en solicitudes
  repetidas.
- Generador de pistas por fallback determinista (I1), sin red ni dependencia
  externa, pensado para que el juego nunca se rompa si el futuro proveedor
  LLM (I2) falla o no esta configurado.
