# Uso de agentes de IA

Este registro documenta el uso de asistentes de desarrollo durante la prueba.
El objetivo es mantener trazabilidad de las propuestas generadas, las decisiones
humanas y la evidencia usada para aceptarlas o corregirlas.

## Protocolo por historia de usuario

Antes de ejecutar una instalacion, crear archivos o modificar codigo, el agente
debe presentar:

1. objetivo y alcance de la historia;
2. propuesta tecnica, archivos afectados y riesgos;
3. validacion concreta que confirmara o refutara la propuesta.

El usuario responde `acepto`, `modificar` o `rechazo`. Solo tras `acepto` se
aplican cambios. Al terminar, se registra la validacion y se propone el commit
asociado. Las intervenciones anteriores a este protocolo se registran de forma
retrospectiva y explicita, sin afirmar una aprobacion que no ocurrio.

Cuando el usuario marque una indicacion como `IMPORTANTE`, `IMPORTANTE!` o
`IMPORTANTE!!!`, se registra en la historia afectada junto con la decision o
cambio que genero antes de cerrar dicha historia.

## Registro

### Gestion del tablero de GitHub

| Campo | Registro |
| --- | --- |
| Objetivo | Crear y configurar el GitHub Project para gestionar las 17 historias P0 de la prueba tecnica. |
| Herramienta | GitHub Copilot en VS Code con automatizacion del navegador. |
| Prompt/resumen | Crear el proyecto, cargar las historias del plan y agregar descripciones y criterios de aceptacion sencillos para seguimiento. |
| Propuesta tecnica | Crear un Project publico vinculado al repositorio, con flujo `Backlog`, `In Progress`, `In review` y `Done`; cargar las HU como borradores para no crear issues publicos. |
| Decision humana | El usuario autorizo el acceso a GitHub, la creacion del Project y la actualizacion directa de las historias. |
| Resultado | Project `Adivina Personaje - Plan 24h` creado con 17 historias P0; cada una tiene descripcion y dos criterios de aceptacion. F1 se preservo en `In Progress`; las demas permanecen en `Backlog`. |
| Verificacion | Se comprobo visualmente la creacion del Project, el flujo de estados y el guardado de F1, F2 y X1; la automatizacion confirmo la actualizacion de las 15 historias restantes. |
| Ajustes o descartes | La primera ejecucion cambio de panel antes de que GitHub terminara de guardar F2; se confirmo el guardado y se repitio el resto esperando la persistencia de cada descripcion. |

### F1 - Inicializar repositorio y herramientas

| Campo | Registro |
| --- | --- |
| Objetivo | Preparar frontend y backend TypeScript ejecutables, con lint, archivos de entorno y documentacion de arranque. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Validar el repositorio y el stack de herramientas necesario para compilar y ejecutar el juego; inicializar la primera historia de usuario. |
| Propuesta aplicada | React + Vite + TypeScript para frontend; Fastify + TypeScript para backend; ESLint; `.env.example`; `.gitignore`; endpoint `GET /health`. |
| Decisiones humanas | El usuario confirmo Node.js y ESLint. La aprobacion formal previa por HU no existia aun; esta entrada es retrospectiva. |
| Ajustes o descartes | Vite genero Oxlint inicialmente; se reemplazo por ESLint. Un primer intento instalo dependencias npm fuera del repositorio; esos artefactos se eliminaron y las dependencias se instalaron en `frontend/` y `backend/`. |
| Verificacion | `frontend`: `npm run lint` y `npm run build` sin errores; Vite respondio HTTP 200. `backend`: `npm run build` sin errores; `GET /health` respondio `{"status":"ok"}`. Git confirma que `backend/.env` y `frontend/.env` estan ignorados. |
| Limitacion | WSL 2 y Docker Desktop no estan instalados; PostgreSQL local queda pendiente para F2. |

### F2 - Definir modelo y migracion

| Campo | Registro |
| --- | --- |
| Objetivo | Definir el modelo relacional y aplicar la primera migracion PostgreSQL para jugador, partida, ronda y cache de entidades. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Propuesta previa para F2: Prisma, PostgreSQL con Docker Compose, entidades minimas, relaciones, indices, restricciones, scripts y validaciones. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: no modificar, instalar ni migrar antes de presentar la propuesta; se presento y el usuario respondio `ACEPTO`. |
| Propuesta tecnica | PostgreSQL 16-alpine con volumen y healthcheck; Prisma 6.19.0; enums de estado y dificultad; `Player`, `Match`, `Round` y `EntityCache`; restriccion unica `matchId + roundNumber`. |
| Decision humana | Aceptado. Se autorizo instalar Prisma, crear configuracion local, levantar Docker y aplicar la migracion inicial. |
| Resultado | Se crearon `docker-compose.yml`, `.env.example`, schema Prisma, scripts `db:generate`, `db:migrate` y `db:studio`, y migracion `20260902061239_init`. |
| Verificacion | `docker compose ps` reporta PostgreSQL saludable; `npm run db:generate` y `npm run db:migrate -- --name init` finalizaron correctamente; existen las tablas `Player`, `Match`, `Round` y `EntityCache`; `npm run build` sigue sin errores. |
| Ajustes o descartes | Se fijo Prisma 6.19.0 para conservar configuracion estable con `DATABASE_URL`, en vez de usar la version mayor mas reciente. No se crearon tablas de ranking, score ni hints porque son datos derivados o propios de partida/ronda. |
| Riesgo pendiente | `npm audit --omit=dev` reporta cuatro vulnerabilidades altas transitivas de Prisma 6 (`deepmerge-ts` y `effect`). No se ejecuto `npm audit fix --force` porque propone un cambio incompatible; revisar actualizacion compatible antes de produccion. |

## Plantilla para proximas historias

### [ID] - [Titulo]

| Campo | Registro |
| --- | --- |
| Objetivo | |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | |
| Propuesta tecnica | |
| Decision humana | Aceptado / Modificado / Rechazado. |
| Resultado | |
| Verificacion | |
| Ajustes o descartes | |