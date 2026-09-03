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

### F3 - Configurar validacion y errores

| Campo | Registro |
| --- | --- |
| Objetivo | Crear infraestructura reutilizable para validar configuracion y requests, y responder errores HTTP de forma consistente. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Analizar el backend real antes de modificarlo y proponer configuracion validada, errores de aplicacion, handler Fastify y validacion Zod reutilizable. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar siempre el contexto construido y no instalar ni modificar antes de una propuesta aprobada; se verifico que solo existia el bootstrap y no se adelantaron endpoints de negocio. |
| Propuesta tecnica | Separar `config/env.ts`, `errors/app-error.ts`, `errors/error-handler.ts` y `http/validate-request.ts`; centralizar el contrato JSON de error y mantener `/health`. |
| Decision humana | Aceptado. |
| Resultado | `DATABASE_URL` y `FRONTEND_ORIGIN` fallan temprano si son invalidas; `PORT` mantiene default local; existen codigos `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE` e `INTERNAL_ERROR`. |
| Ajustes o descartes | `AI_API_KEY=` vacia en el entorno local bloqueaba el arranque pese a que I2 no esta implementada; se mantuvo opcional/vacia hasta la historia de integracion LLM. La ruta `GET /__debug/error` solo se habilita fuera de produccion para validar el handler. |
| Verificacion | `npm run build` sin errores; `/health` responde 200; ruta inexistente responde `404/NOT_FOUND`; `GET /__debug/error` responde `500/INTERNAL_ERROR` sin stack trace; ejecutar desde un directorio sin `.env` y sin `DATABASE_URL` termina con ZodError y codigo 1. |

### G1 - Crear partida

| Campo | Registro |
| --- | --- |
| Objetivo | Exponer `POST /matches` para crear una partida nueva y reutilizar al jugador identificado por alias. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Proponer e implementar una ruta de partidas con Prisma, validacion de alias, repositorios y servicio, sin adelantar rondas, PokéAPI, pistas ni puntaje. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar el contexto antes de cambiarlo y no implementar fuera del alcance de G1; se confirmo que no existian modulos de negocio y solo se agrego creacion de partida. |
| Decision humana | Aceptado, incluyendo `normalizedAlias` unico para que variantes como `Ash` y ` ash ` no creen jugadores distintos. |
| Propuesta tecnica | Prisma Client compartido, repositorio de jugadores con `upsert`, repositorio de partidas, servicio de normalizacion/orquestacion y ruta `POST /matches`. |
| Resultado | Se agrego `normalizedAlias` unico mediante la migracion `20260903014601_add_normalized_player_alias`; el endpoint responde `201` con datos de una partida `IN_PROGRESS` en dificultad `EASY`. |
| Ajustes o descartes | Fastify rechazo un schema de respuesta Zod usado directamente en la ruta; se retiro porque el proyecto no tiene adaptador Zod para schemas Fastify. El handler central se ajusto para traducir errores 400 nativos de Fastify a `VALIDATION_ERROR`. |
| Verificacion | Prisma Client generado, migracion aplicada y `npm run build` sin errores. Dos requests con `Ash` y ` ash ` devolvieron el mismo `playerId` y distinto `matchId`; alias invalido devolvio HTTP 400; Prisma confirma un unico jugador `ash` y cuatro partidas de las pruebas. |

### G2 - Crear ronda desde PokéAPI

| Campo | Registro |
| --- | --- |
| Objetivo | Crear la siguiente ronda de una partida activa usando PokéAPI, cachear sus datos y no revelar la respuesta al cliente. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Proponer provider PokéAPI, cache de entidades, reglas de ronda, imagen opaca y validaciones, sin adelantar conjeturas ni puntaje. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar el contexto real, no modificar antes de aprobar y no adelantar funcionalidades; se confirmo que G3 no existe y G2 solo crea/entrega una ronda oculta. |
| Decision humana | Aceptado, incluyendo servir la imagen desde `/rounds/:roundId/image` y proteger una ronda activa por partida desde PostgreSQL. |
| Propuesta tecnica | `fetch` nativo Node 24 con timeout de 3 segundos, `CharacterProvider`/`PokeApiProvider`, cache con TTL de 24 horas, repositorios y servicio de rondas. |
| Resultado | Se agregaron `POST /matches/:matchId/rounds` y `GET /rounds/:roundId/image`; el nombre e ID externo quedan internos. Se crearon migraciones para un indice unico parcial de ronda `ACTIVE` y la FK `Round.entityId` a `EntityCache`. |
| Ajustes o descartes | La primera prueba POST no envio JSON y Fastify la trato como media type no soportado; el handler se ajusto para responder `400/VALIDATION_ERROR` en lugar de 500. Se corrigio la migracion agregando la FK que faltaba entre el modelo Prisma y PostgreSQL. |
| Verificacion | Prisma Client generado, migraciones aplicadas y `npm run build` sin errores. La respuesta de ronda devolvio 201 sin `entityName`, `entityId`, tipos ni habilidades; segunda ronda activa devolvio `409/CONFLICT`; partida inexistente devolvio `404/NOT_FOUND`; proxy de imagen devolvio `200 image/png`; PostgreSQL confirma `Round_entityId_fkey`; provider con entidad invalida devolvio `502/UPSTREAM_UNAVAILABLE`. |

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