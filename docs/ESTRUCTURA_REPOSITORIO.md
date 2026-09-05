# Estructura del repositorio - Adivina Personaje

Estado: refleja el arbol real tras F1-F3, G1-G4 e I1.

```text
Adivina_Personaje/
├── .env.example              # Variables para Docker Compose (Postgres)
├── .gitignore
├── docker-compose.yml         # PostgreSQL local para desarrollo
├── README.md                  # Proposito, stack, ejecucion y rutas
├── AI_USAGE.md                # Registro de uso de agentes de IA por HU
│
├── .github/
│   └── copilot-instructions.md  # Reglas persistentes del proyecto
│
├── docs/
│   ├── ARQUITECTURA.md
│   ├── ESTRUCTURA_REPOSITORIO.md
│   └── FLUJO_JUEGO.md
│
├── backend/
│   ├── .env.example           # Variables del backend (DB, IA, CORS)
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma      # Modelo de datos (Player, Match, Round, EntityCache)
│   │   └── migrations/        # Historial de migraciones aplicadas
│   └── src/
│       ├── server.ts          # Bootstrap Fastify, registro de rutas y CORS
│       ├── config/
│       │   └── env.ts         # Validacion de variables de entorno (Zod)
│       ├── database/
│       │   └── prisma.ts      # Instancia unica de Prisma Client
│       ├── errors/
│       │   ├── app-error.ts       # Clase AppError (statusCode, code, message)
│       │   └── error-handler.ts   # Handler global de errores Fastify
│       ├── http/
│       │   └── validate-request.ts # Helper generico de validacion Zod
│       ├── players/
│       │   └── player.repository.ts # Buscar/crear jugador por alias normalizado
│       ├── matches/
│       │   ├── match.repository.ts  # Acceso a datos de Match
│       │   ├── match.service.ts     # Crear partida, finalizar partida
│       │   └── match.routes.ts      # POST /matches, POST /matches/:id/finish
│       ├── providers/
│       │   ├── character-provider.ts # Interfaz CharacterProvider
│       │   └── pokeapi.provider.ts   # Adaptador PokeAPI con timeout
│       ├── entities/
│       │   └── entity-cache.repository.ts # Cache de entidades (TTL)
│       ├── rounds/
│       │   ├── round.repository.ts  # Acceso a datos de Round
│       │   ├── image-obfuscation.ts # Procesa artwork con Sharp en memoria
│       │   ├── round.service.ts     # Crear ronda, servir imagen, resolver guess
│       │   └── round.routes.ts      # POST rounds, GET image, POST guess
│       ├── scoring/
│       │   └── scoring.service.ts   # Calculo puro de puntaje y racha
│       ├── hints/
│       │   ├── hint-provider.ts         # Contrato HintProvider
│       │   └── fallback-hint.provider.ts # Pistas deterministas sin red
│       └── utils/
│           └── normalize-text.ts    # Normalizacion de texto para comparar alias/guess
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
        ├── App.tsx              # Scaffold inicial de Vite (pendiente de UI real)
        ├── App.css
        └── index.css
```

## Convenciones

- Cada carpeta bajo `backend/src/` representa un dominio (`matches`, `rounds`,
  `players`, `hints`, `scoring`) o una responsabilidad transversal (`errors`,
  `config`, `http`, `database`, `providers`, `utils`).
- Dentro de cada dominio: `*.repository.ts` (datos), `*.service.ts` (reglas de
  negocio) y `*.routes.ts` (HTTP). Las rutas nunca acceden a Prisma
  directamente.
- Las migraciones de Prisma se versionan en Git; nunca se edita una migracion
  ya aplicada, se crea una nueva.
- El frontend aun conserva el scaffold generado por Vite: la interfaz real de
  juego se construira en las historias `U1`-`U3`.
