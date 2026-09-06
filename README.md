# Adivina Personaje

Juego web de adivinanza de personajes basado en PokéAPI con arquitectura de monolito modular, persistencia en PostgreSQL con Prisma, inteligencia artificial para pistas progresivas (LLM + fallback determinista), dificultad adaptativa, dos modos de juego (`STANDARD` y `STREAK`) y ranking global.

## Stack tecnológico

- **Frontend**: React 19, TypeScript, Vite, CSS con diseño responsive personalizado.
- **Backend**: Node.js 24, TypeScript, Fastify 5, Prisma ORM 6, Zod, Sharp.
- **IA**: LLM compatible con API OpenAI (por ejemplo, Ollama local con `qwen2.5:3b`) + `FallbackHintProvider` determinista.
- **Persistencia & Infraestructura**: PostgreSQL 16 en contenedor Docker Compose.

## Requisitos locales

- Node.js LTS 24 o superior y `npm`.
- Docker Desktop con WSL 2 o PostgreSQL 16 ejecutable localmente.
- Ollama local (opcional) si se desea probar la generación de pistas LLM en vivo.

## Guía de ejecución rápida

### 1. Variables de entorno e Infraestructura

Desde la raíz del repositorio (`Adivina_Personaje`):

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
docker compose up -d
docker compose ps
```

### 2. Base de datos y Migraciones

Genera el cliente Prisma y aplica las migraciones a PostgreSQL:

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate -- --name init
```

### 3. Ejecución de Servidores

En dos terminales independientes:

```powershell
# Terminal 1: Backend API (Puerto 3001)
npm.cmd --prefix backend run start
```

```powershell
# Terminal 2: Frontend UI (Puerto 5173)
npm.cmd --prefix frontend run dev -- --host localhost
```

Abre **[http://localhost:5173](http://localhost:5173)** en tu navegador para jugar.
El backend expone `GET http://localhost:3001/health` para verificar el estado de la API.

---

## Catálogo de Endpoints REST (Backend)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Verificación de salud del servidor. |
| `POST` | `/matches` | Crea una partida indicando `alias` y `gameMode` (`STANDARD` o `STREAK`). |
| `POST` | `/matches/:matchId/rounds` | Crea una ronda activa con una entidad oculta obtenida de PokéAPI o caché. |
| `GET` | `/rounds/:roundId/image` | Entrega silueta PNG en estado `ACTIVE`, artwork original en `RESOLVED`, o `409` en `EXPIRED`. |
| `POST` | `/rounds/:roundId/hints` | Solicita hasta 3 pistas progresivas (LLM primero con fallback determinista). |
| `POST` | `/rounds/:roundId/guess` | Envía conjetura, resuelve ronda, calcula puntaje, racha y auto-finaliza si corresponde. |
| `POST` | `/matches/:matchId/finish` | Finaliza manualmente una partida activa sin ronda activa de forma idempotente. |
| `GET` | `/ranking?limit=10` | Devuelve el ranking global de partidas `FINISHED` ordenadas por `totalScore`. |

---

## Guía de pruebas manuales desde la UI

1. Ingresa a `http://localhost:5173`.
2. Introduce tu alias (ej. `Ash`) y selecciona el modo de juego (`STANDARD` o `STREAK`).
3. Haz clic en **Iniciar partida**.
4. La ronda iniciará automáticamente presentando la silueta del personaje, el contador de bonus (30s) y las pistas disponibles.
5. Haz clic en **Solicitar pista** (hasta 3 veces) para obtener pistas progresivas generadas.
6. Escribe tu conjetura y presiona **Responder**.
7. Si aciertas, verás la imagen revelada, el puntaje obtenido y la opción de pasar a la siguiente ronda.
8. En modo `STREAK`, al fallar la partida terminará automáticamente mostrando el **Ranking global**.

---

## Ejecución de Pruebas Automatizadas

Para ejecutar la suite unificada de 35 pruebas automatizadas (17 unitarias de dominio + 18 de integración HTTP):

```powershell
npm.cmd --prefix backend test
```
