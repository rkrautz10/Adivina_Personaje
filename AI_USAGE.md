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

### G3 - Resolver conjetura

| Campo | Registro |
| --- | --- |
| Objetivo | Resolver una conjetura y calcular/persistir puntaje y racha exclusivamente en el backend. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Proponer normalizacion exacta, puntaje puro y una transaccion Prisma para resolver la ronda sin adelantar pistas, dificultad, finalizacion o ranking. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar que el modelo ya tuviera tiempo, pistas, puntaje, estado y racha antes de implementar; se confirmo que G3 no requiere migracion ni dependencias nuevas. |
| Decision humana | Aceptado. |
| Propuesta tecnica | Normalizacion de texto sin tildes ni mayusculas, comparacion exacta, `scoring.service` puro y transaccion serializable con actualizacion condicional de ronda activa. |
| Resultado | Se agrego `POST /rounds/:roundId/guess`. El cliente solo envia `guess`; el servidor calcula tiempo, puntaje, racha, resolucion y total de partida. |
| Ajustes o descartes | No se agrego Levenshtein: puede aceptar respuestas incorrectas y es P1. La primera prueba de doble conjetura uso JSON mal escapado y devolvio 400; se repitio con JSON valido y devolvio 409. |
| Verificacion | `npm run build` sin errores. Acierto con nombre en mayusculas/espacios: `correct: true`, puntaje 149 y racha 1. Fallo: puntaje 0, racha 0 y nombre revelado. Segunda conjetura valida sobre la ronda resuelta: HTTP 409. Prisma confirma ambos resultados y totales persistidos. |

### G4 - Finalizar partida

| Campo | Registro |
| --- | --- |
| Objetivo | Finalizar una partida de manera idempotente y persistir su estado final sin alterar puntaje ni racha. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Proponer cierre transaccional de Match, sin ranking, pistas ni dificultad adaptativa. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: no modificar antes de la propuesta aprobada y validar el contexto existente; se confirmo que Match y Round ya tienen estados, fechas y datos necesarios. |
| Decision humana | Aceptado. |
| Propuesta tecnica | Transaccion serializable, lectura de rondas, bloqueo de cierre con ronda `ACTIVE` y actualizacion condicional de `IN_PROGRESS` a `FINISHED`. |
| Resultado | Se agrego `POST /matches/:matchId/finish`. Una partida finalizada retorna su misma representacion sin modificar `finishedAt`, total ni racha. |
| Ajustes o descartes | No se agregaron migraciones ni dependencias: el schema existente contiene los campos requeridos. No se cerro automaticamente la partida tras una conjetura, porque el cierre pertenece a G4. |
| Verificacion | `npm run build` sin errores. Cierre de partida con ronda resuelta: `200/FINISHED`, total 149 y una ronda. Repetir cierre devolvio el mismo `finishedAt`. Partida con ronda activa devolvio `409/CONFLICT`; partida inexistente devolvio `404/NOT_FOUND`. Prisma confirma el estado final persistido. |

### I1 - Implementar fallback de pistas

| Campo | Registro |
| --- | --- |
| Objetivo | Crear un generador determinista de tres pistas progresivas que no dependa de LLM, red ni nombre de entidad. |
| Herramienta | GitHub Copilot en VS Code. |
| Prompt/resumen | Proponer un provider puro basado solo en los atributos almacenados de PokéAPI, sin endpoint HTTP, persistencia, penalizacion ni dificultad adaptativa. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar que `EntityCache` ya tuviera tipos, altura, peso y habilidades; no adelantar I3 ni I2. |
| Decision humana | Aceptado; se eligio implementar solo el provider puro y dejar persistencia/control de `hintsUsed` para I3. |
| Propuesta tecnica | `HintProvider` con niveles 1, 2 y 3; `FallbackHintProvider` con tipo, rango humano de altura y habilidad, mas textos seguros ante atributos faltantes. |
| Resultado | Se crearon el contrato de pistas y el fallback sin I/O. La entrada no contiene `entityName`, ID ni texto del jugador. |
| Ajustes o descartes | No se persisten pistas en `Round.hints` ni se aplican penalizaciones: esas responsabilidades requieren endpoint e idempotencia y pertenecen a I3. |
| Verificacion | Prueba directa generó pistas por tipo, altura y habilidad; con atributos incompletos devolvio textos seguros sin error. `npm run build` finalizo sin errores. |

### I2 - Integrar LLM seguro

| Campo | Registro |
| --- | --- |
| Objetivo | Integrar un proveedor LLM intercambiable que genere pistas cortas y mantenga el fallback determinista ante cualquier fallo. |
| Herramienta | Agente especializado `llm-seguridad` con nivel Master y GitHub Copilot en VS Code. |
| Prompt/resumen | Reevaluar OpenAI, proveedores cloud con tier gratuito, Ollama local y el flujo LLM primero con fallback, priorizando costo cero, privacidad, latencia, reversibilidad y bajo impacto. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: actuar como `llm-seguridad` Master, reevaluar costos y disponibilidad sin modificar ni instalar antes de la decisión humana; se aceptó implementar Ollama local mediante cliente OpenAI-compatible con fallback obligatorio. |
| Decision humana | Aceptado. Se eligió Ollama local como proveedor principal sin costo por solicitud, dejando proveedores OpenAI-compatible como alternativa y `FallbackHintProvider` como plan B. |
| Propuesta tecnica | Convertir `HintProvider.generateHint` a `Promise<string>`; adaptar el fallback sin alterar sus textos; crear `LlmHintProvider` con SDK `openai`, modelo configurable, base URL configurable, timeout de 3 segundos, máximo 60 tokens, temperatura baja y errores tipados. |
| Resultado | Se agregó `openai`, el proveedor OpenAI-compatible, `HintProviderError`, configuración `AI_MODEL`/`AI_BASE_URL`, pruebas unitarias y el script `npm test`. I2 no agregó endpoint, persistencia, rate limiting, dificultad adaptativa ni cambios en Prisma. |
| Ajustes o descartes | OpenAI `gpt-4o-mini` quedó como alternativa cloud de pago por uso, no como opción gratuita. Groq y Gemini quedan sujetos a sus tiers y límites vigentes. La validación anti-spoiler final y la orquestación LLM -> fallback pertenecen a I3. |
| Verificacion | `npm test`: 5 pruebas pasan sin red ni claves reales (configuración ausente, respuesta válida, salida vacía/larga, timeout y fallback asíncrono). `npm run build` pasa sin errores. La API oficial de OpenAI, Gemini, Groq y Ollama fue consultada para distinguir SDK gratuito, API cloud con límites y ejecución local sin costo por solicitud. |

### Ajuste transversal - bucle de juego y orden de trabajo

| Campo | Registro |
| --- | --- |
| Objetivo | Fijar las reglas del bucle de juego y ordenar I3, G2, modos, D1, U1-U3, Q1-Q2 y X1 sin mezclar responsabilidades. |
| Herramienta | GitHub Copilot con agentes especializados de nivel Master. |
| Prompt/resumen | Mantener dos tiempos, exigir obfuscacion server-side, implementar `STANDARD` y `STREAK`, documentar decisiones y separar I3 de HUs posteriores. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: cumplir el bucle de juego completo y documentar instrucciones, decisiones, flujos y orden de trabajo; se descarta en esta etapa la alternativa de puntuacion 100/50/20. |
| Decision humana | Aceptado. El orden aprobado es I3; correccion G2; modos; D1; U1; U2; U3; Q1/Q2; documentacion final. |
| Resultado | Se actualizaron las instrucciones del proyecto, ADR-09, el flujo del juego y esta bitacora. Las HUs de GitHub se ajustaran con el mismo alcance y dependencias. |
| Verificacion | Se contrastaron las reglas con el schema Prisma, servicios de rondas, puntaje, partidas y documentacion existente. No se implementaron cambios funcionales en esta actualizacion. |

### I3 - Exponer solicitud de pista

| Campo | Registro |
| --- | --- |
| Objetivo | Exponer hasta tres pistas por ronda con flujo LLM primero, fallback determinista, persistencia y expiracion reutilizable por abandono. |
| Herramienta | Agente especializado `backend-dominio` con nivel Master, coordinando `llm-seguridad` y `pruebas-calidad`. |
| Prompt/resumen | Implementar `POST /rounds/:roundId/hints`, validacion anti-spoiler, incremento atomico de `hintsUsed`, persistencia en `Round.hints` y abandono a los 3 minutos sin tocar modos, imagen, dificultad ni formula de puntaje. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: respetar el alcance de I3, validar el contexto antes de editar, conservar la formula de G3 y registrar esta instruccion antes de cerrar la HU. |
| Decision humana | Aceptado. Se mantuvo la formula vigente de G3 y se eligio derivar el nivel progresivo desde `hintsUsed`, sin confiar en un nivel enviado por el cliente. |
| Propuesta tecnica | Servicio de pistas transaccional con `Serializable`; intenta `LlmHintProvider`, valida spoiler internamente y usa `FallbackHintProvider` ante error, timeout, salida invalida o spoiler. Servicio reutilizable de abandono conectado a pistas, crear ronda, guess y finish. |
| Resultado | Se agregaron `POST /rounds/:roundId/hints`, `hint.service.ts`, `hint-validation.ts` y `abandonment.service.ts`. Se actualizaron rutas, servicios de ronda/partida y el contrato de errores. No se agregaron migraciones ni dependencias. |
| Ajustes o descartes | La expiracion queda filtrada por la ronda o partida solicitada para evitar afectar otra partida activa. No se implementaron modos, obfuscacion, dificultad, ranking, rate limiting ni la alternativa de puntuacion 100/50/20. |
| Verificacion | `npm test`: 7 pruebas pasan, incluyendo anti-spoiler, fallback y timeout. `npm run build` pasa sin errores. Prueba HTTP real con PostgreSQL: tres pistas devolvieron `hintsUsed=3` y `remainingHints=0`, la cuarta respondió `409`, la respuesta solo expuso `hint`, `hintsUsed` y `remainingHints`, sin `entityName` ni `entityId`. No se uso una clave real ni se llamo a Ollama. |

### Correccion transversal G2 - imagen obfuscada server-side

| Campo | Registro |
| --- | --- |
| Objetivo | Evitar que una ronda activa exponga el artwork original y revelar la imagen solo despues de resolver. |
| Herramienta | Agente `backend-dominio` nivel Master, coordinando `pruebas-calidad` y `arquitectura-documentacion`. |
| Prompt/resumen | Evaluar compatibilidad y alternativas antes de usar Sharp; procesar la imagen en backend, mantener la ruta y definir revelacion por estado. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar Sharp antes de instalarlo, no delegar la obfuscacion al frontend, documentar la decision y conservar la ruta existente. |
| Decision humana | Aceptado. Se eligio Sharp por compatibilidad con Node 24, rendimiento sobre buffers y bajo impacto; Jimp, Canvas y filtros en frontend se descartaron. |
| Propuesta tecnica | Procesar en memoria el buffer con escala de grises, reduccion, blur y PNG sin metadata para `ACTIVE`; entregar original en `RESOLVED` y rechazar `EXPIRED` con `409`. |
| Resultado | Se agregaron Sharp, `image-obfuscation.ts` y pruebas de transformación. `GET /rounds/:roundId/image` conserva su ruta y aplica la regla de revelacion por estado. No se modificaron Prisma, puntaje, pistas, abandono, modos, dificultad, ranking ni frontend. |
| Verificacion | `npm test`: 9 pruebas pasan; el transformador produce PNG, reduce a 96 px de ancho, cambia el buffer y rechaza datos invalidos. Prueba HTTP real de ronda `ACTIVE`: `GET /rounds/:roundId/image` devolvio `image/png` con firma PNG y buffer procesado. `npm run build` se ejecuta antes del cierre. |

### G5 - Configurar modos STANDARD y STREAK

| Campo | Registro |
| --- | --- |
| Objetivo | Persistir los modos `STANDARD` y `STREAK` y aplicar sus reglas de finalizacion exclusivamente en backend. |
| Herramienta | Agente `backend-dominio` nivel Master, coordinando `pruebas-calidad` y `arquitectura-documentacion`. |
| Prompt/resumen | Agregar `GameMode` en Prisma, seleccionar modo al crear la partida, cerrar `STANDARD` en ronda 10 y `STREAK` al primer fallo, sin modificar pistas, imagen, puntaje, tiempos, dificultad, ranking ni frontend. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: aplicar los modos persistidos, usar transacciones y actualizaciones condicionadas, incluir estado final de partida en `guess` y documentar la decision. |
| Decision humana | Aceptado. `STANDARD` es el default compatible; `STREAK` no tiene limite fijo y termina al primer fallo; ambos terminan por abandono. |
| Propuesta tecnica | Enum Prisma `GameMode`, campo `Match.gameMode`, migracion con default, validacion Zod de `gameMode`, limite de 10 solo para `STANDARD` y finalizacion en la transaccion de `resolveGuess`. |
| Resultado | Se creó y aplicó la migracion `20260905225650_add_game_mode`; crear partida devuelve `gameMode`; `guess` devuelve `matchStatus` y `gameMode`; los cierres automaticos se aplican por modo. |
| Ajustes o descartes | Se conservan formula de puntaje, tiempo de bonus, abandono, pistas, Sharp, dificultad, ranking, frontend y autenticacion. No se agrego una tabla para modos. |
| Verificacion | Migracion aplicada y Prisma Client generado. `npm test`: 11 pruebas pasan. `npm run build` pasa. HTTP real: default `STANDARD`; `STREAK` con fallo devuelve `FINISHED` y bloquea nueva ronda con `409`; diez rondas `STANDARD` terminan en `FINISHED` y bloquean la ronda 11 con `409`. |

### D1 - Calcular dificultad adaptativa

| Campo | Registro |
| --- | --- |
| Objetivo | Ajustar la dificultad de la siguiente ronda desde el rendimiento reciente sin alterar puntaje, modos ni tiempos. |
| Herramienta | Agente `backend-dominio` nivel Master, coordinando `pruebas-calidad` y `arquitectura-documentacion`. |
| Prompt/resumen | Usar tres rondas resueltas, cambiar como maximo un nivel y seleccionar IDs por rangos `EASY`/`MEDIUM`/`HARD` sin migraciones ni cambios de contrato ajenos. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: validar contexto antes de editar, conservar los modos, puntuacion, pistas, imagen y tiempos, y documentar la regla adaptativa. |
| Decision humana | Aceptado. Tres aciertos suben un nivel; cero o uno bajan; dos mantienen; menos de tres no cambian. |
| Propuesta tecnica | Servicio puro de dificultad con rangos nombrados, integrado dentro de la transaccion `Serializable` de `resolveGuess`; la siguiente ronda usa el nivel persistido. |
| Resultado | Se agregaron `difficulty.service.ts` y pruebas. La dificultad se actualiza tras resolver, excepto cuando la partida finaliza por modo. Crear ronda selecciona IDs por el rango de la dificultad actual. |
| Ajustes o descartes | No se agregaron migraciones, dependencias ni cambios en puntaje, abandono, modos, pistas, Sharp, ranking, frontend o autenticacion. |
| Verificacion | `npm test`: 16 pruebas pasan. `npm run build` pasa. HTTP real: tres aciertos consecutivos en `STREAK` hicieron que la siguiente ronda respondiera `difficultyLevel: MEDIUM`. |

### U1 - Inicio y partida

| Campo | Registro |
| --- | --- |
| Objetivo | Crear la pantalla responsive de inicio para capturar alias, seleccionar modo y crear una partida real. |
| Herramienta | Agente `frontend-juego` nivel Master, coordinando `backend-dominio`, `pruebas-calidad` y `arquitectura-documentacion`. |
| Prompt/resumen | Reemplazar el scaffold Vite por una interfaz operativa sin adelantar ronda, imagen, pistas, conjetura, resultado o ranking. |
| Indicacion IMPORTANTE | `IMPORTANTE!!!`: consumir `POST /matches`, enviar siempre `gameMode`, mantener al backend como autoridad y proporcionar instrucciones de prueba manual al finalizar. |
| Decision humana | Aceptado. U1 conserva `matchId` en estado local como puente para U2 y no crea una ronda automaticamente. |
| Propuesta tecnica | Formulario React con alias, radios `STANDARD`/`STREAK`, estados de carga/error/exito, validacion basica de experiencia y mensajes seguros del backend. |
| Resultado | Se reemplazo el scaffold de Vite por la pantalla "Adivina Personaje" y se conecto con `POST /matches` usando `VITE_API_URL`. La vista muestra alias, modo, dificultad, estado y `matchId` tras crear la partida. |
| Ajustes o descartes | No se agregaron dependencias, imagenes de Pokemon, rondas, pistas, guess, resultado, ranking ni logica de negocio en frontend. La prueba con `127.0.0.1` revelo CORS por diferir de `FRONTEND_ORIGIN`; se usa `http://localhost:5173` como URL de prueba. |
| Verificacion | `npm run lint` y `npm run build` pasan. Pruebas manuales en navegador: alias `Misty` con modo `STREAK` y alias `Brock` con modo `STANDARD`, ambas partidas creadas con estado `IN_PROGRESS` y dificultad `EASY`. Vista movil de 390 px sin overflow horizontal. |

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