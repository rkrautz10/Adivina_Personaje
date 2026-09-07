# Estructura del repositorio - Adivina Personaje

Estado: refleja el árbol real tras completar todas las historias de usuario (F1-F3, G1-G5, I1-I3, D1, U1-U3, Q1-Q2, X1).

```text
Adivina_Personaje/
├── .env.example              # Variables para Docker Compose (Postgres)
├── .gitignore
├── docker-compose.yml         # PostgreSQL 16 local para desarrollo
├── README.md                  # Propósito, stack, ejecución, catálogo de endpoints y pruebas
├── AI_USAGE.md                # Bitácora obligatoria de uso de agentes de IA por HU
│
├── .github/
│   ├── copilot-instructions.md  # Reglas persistentes e invariantes del proyecto
│   └── agents/                  # Agentes especializados en nivel Master
│       ├── arquitectura-documentacion.agent.md
│       ├── backend-dominio.agent.md
│       ├── frontend-juego.agent.md
│       ├── llm-seguridad.agent.md
│       └── pruebas-calidad.agent.md
│
├── docs/
│   ├── ARQUITECTURA.md          # Componentes, arquitectura modular, capas y resiliencia
│   ├── ESTRUCTURA_REPOSITORIO.md# Mapeo del árbol de archivos y convenciones
│   └── FLUJO_JUEGO.md           # Flujo end-to-end, máquinas de estados y diagramas Mermaid
│
├── backend/
│   ├── .env.example           # Variables del backend (DB, IA, CORS, Timeout)
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma      # Modelo de datos (Player, Match, Round, EntityCache, GameMode)
│   │   └── migrations/        # Historial de migraciones aplicadas
│   └── src/
│       ├── app.ts             # Factoría buildApp() para servidor y pruebas de integración
│       ├── server.ts          # Bootstrap Fastify, inicio del servidor HTTP
│       ├── config/
│       │   └── env.ts         # Validación de variables de entorno (Zod)
│       ├── difficulty/
│       │   ├── difficulty.service.ts      # Ventana adaptativa y rangos de IDs
│       │   └── difficulty.service.test.ts # Pruebas unitarias de dificultad
│       ├── database/
│       │   └── prisma.ts      # Instancia única de Prisma Client
│       ├── errors/
│       │   ├── app-error.ts       # Clase AppError (statusCode, code, message)
│       │   └── error-handler.ts   # Handler global de errores Fastify
│       ├── http/
│       │   └── validate-request.ts # Helper genérico de validación Zod
│       ├── players/
│       │   └── player.repository.ts # Buscar/crear jugador por alias normalizado
│       ├── matches/
│       │   ├── abandonment.service.ts # Expiración reutilizable por abandono (3 min)
│       │   ├── match.repository.ts    # Acceso a datos de Match y consulta de ranking
│       │   ├── match.service.ts       # Crear/finalizar partida y ranking
│       │   ├── match.routes.ts        # POST /matches, finish y GET /ranking
│       │   ├── game-mode.test.ts      # Pruebas de contrato de modos de juego
│       │   ├── matches.integration.test.ts # Pruebas de integración HTTP de partidas
│       │   └── ranking.integration.test.ts # Pruebas de integración HTTP de ranking
│       ├── providers/
│       │   ├── character-provider.ts # Interfaz CharacterProvider
│       │   └── pokeapi.provider.ts   # Adaptador PokéAPI con timeout (3s)
│       ├── entities/
│       │   └── entity-cache.repository.ts # Caché de entidades con TTL (24h)
│       ├── rounds/
│       │   ├── round.repository.ts  # Acceso a datos de Round
│       │   ├── image-obfuscation.ts # Máscara de silueta con Sharp en memoria
│       │   ├── image-obfuscation.test.ts # Pruebas unitarias de silueta y PNG
│       │   ├── round.service.ts     # Crear ronda, servir imagen, resolver guess
│       │   ├── round.routes.ts      # Endpoints POST /rounds, GET /image, POST /guess
│       │   └── rounds.integration.test.ts # Pruebas de integración HTTP de rondas
│       ├── scoring/
│       │   ├── scoring.service.ts      # Cálculo puro de puntaje, bonus y racha
│       │   └── scoring.service.test.ts # Pruebas unitarias de puntuación
│       ├── hints/
│       │   ├── hint-provider.ts         # Contrato asíncrono HintProvider
│       │   ├── hint-provider.error.ts   # Errores tipados de proveedor IA
│       │   ├── hint-validation.ts       # Validación anti-spoiler de pistas
│       │   ├── hint-validation.test.ts  # Pruebas unitarias de anti-spoiler
│       │   ├── fallback-hint.provider.ts # Pistas deterministas sin red
│       │   ├── llm-hint.provider.ts     # Proveedor OpenAI-compatible (Ollama/OpenAI)
│       │   ├── llm-hint.provider.test.ts# Pruebas unitarias de cliente LLM y fallback
│       │   └── hint.service.ts          # Orquestación LLM -> Fallback e I3 endpoint
│       └── utils/
│           ├── normalize-text.ts      # Normalización de texto sin acentos
│           └── normalize-text.test.ts # Pruebas unitarias de normalización
│
└── frontend/
    ├── .env.example            # VITE_API_URL
    ├── package.json
    ├── eslint.config.js
    ├── tsconfig*.json
    ├── vite.config.ts
    ├── public/
    └── src/
        ├── main.tsx             # Punto de entrada React
        ├── App.tsx              # Interfaz completa (Setup U1, Ronda U2, Resultado y Ranking U3)
        ├── App.css              # Estilos de interfaz responsiva
        └── index.css            # Tipografía, colores de tema y resets
```

## Convenciones

- Cada carpeta bajo `backend/src/` representa un dominio (`matches`, `rounds`,
  `players`, `hints`, `scoring`, `difficulty`) o una responsabilidad transversal (`errors`,
  `config`, `http`, `database`, `providers`, `utils`).
- Dentro de cada dominio: `*.repository.ts` (datos), `*.service.ts` (reglas de
  negocio) y `*.routes.ts` (HTTP). Las rutas nunca acceden a Prisma
  directamente.
- Las migraciones de Prisma se versionan en Git; nunca se edita una migración
  ya aplicada, se crea una nueva.
- El frontend en React consume la API REST del backend desacoplado, respetando
  que el backend es la autoridad única sobre las reglas, tiempos, puntaje y estados.
