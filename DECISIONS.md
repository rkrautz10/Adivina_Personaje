# Decisiones de arquitectura - Adivina Personaje

Este documento registra las decisiones tomadas durante el reto, las
alternativas consideradas (incluyendo las de los analisis previos) y por que
se eligio la opcion balanceada. Formato ADR corto: contexto, decision,
alternativas, consecuencias.

---

## ADR-01: Alcance general - solucion balanceada, no MVP minimo ni avanzada

**Contexto:** los analisis previos del reto identificaron tres niveles de
ambicion posibles:

- **MVP minimo:** backend simple sin capas formales, fallback como unica
  "IA", sin dificultad adaptativa, SQLite. Rapido (~12-14h) pero con poco
  margen para mostrar profundidad tecnica.
- **Balanceada (elegida):** monolito modular, PokeAPI, IA real (LLM) con
  fallback, dificultad adaptativa simple, tests priorizados, documentacion
  completa. Tiempo estimado ~22-24h.
- **Avanzada:** suma autenticacion real, CI/CD, ambas capacidades de IA
  combinadas con mas matices, mayor cobertura de tests, cache distribuido.
  Riesgo alto de no terminar ni poder defenderlo en 45 minutos; el enunciado
  premia explicitamente "una entrega enfocada y completa" sobre "una
  ambiciosa a medias".

**Decision:** implementar la opcion balanceada.

**Por que:** maximiza exactamente las dimensiones que el reto dice evaluar
(arquitectura, calidad, integracion, IA, backend, agentes, proceso agil,
documentacion, comunicacion) dentro del tiempo real disponible. El MVP minimo
deja poco que defender en la sustentacion; la avanzada arriesga no llegar a
un estado demostrable de punta a punta.

**Consecuencias:** se acepta no tener autenticacion, multijugador,
microservicios ni infraestructura de produccion. Se documentan como
evolucion futura, no como pendientes olvidados.

---

## ADR-02: Eleccion de API - PokeAPI sobre Marvel

**Contexto:** el reto permite elegir entre PokeAPI (sin autenticacion, datos
ricos para pistas, imagenes listas para ocultar) y Marvel (requiere firma
`md5(ts+priv+pub)`, obliga a un proxy de secretos, datos menos estructurados
para pistas).

**Alternativas consideradas:**

- **Marvel:** demuestra "gratis" manejo de credenciales sensibles y firma de
  requests, pero consume horas en depurar autenticacion y limites diarios
  agotables, tiempo que no se invierte en las dimensiones evaluadas.
- **PokeAPI (elegida):** menor friccion de integracion, atributos numericos
  y categoricos (tipos, altura, peso, habilidades) ideales para pistas
  deterministas, imagenes de alta calidad para ocultar.

**Decision:** usar PokeAPI.

**Por que:** reduce complejidad accidental de integracion y libera tiempo
para backend, IA, persistencia, seguridad y documentacion, que es donde el
reto pide mostrar criterio senior. La eleccion no reduce el criterio de
integracion: el backend igual encapsula la fuente detras de un
`CharacterProvider`, timeout de 3s y cache con TTL, por lo que migrar a
Marvel mas adelante seria sustituir un adaptador, no reescribir el dominio.

**Consecuencias:** las pistas se basan en atributos de combate/fisicos, no en
apariciones o comics. Si se quisiera enfatizar "manejo de secretos
obligatorio", Marvel seria la eleccion correcta; no es el caso aqui porque ya
se demuestra manejo de secretos con `DATABASE_URL` y `AI_API_KEY`.

---

## ADR-03: Monolito modular en vez de microservicios

**Contexto:** ambos analisis previos coincidian en descartar microservicios
para este alcance: un unico desarrollador, ~24h, sin necesidad real de
escalar componentes de forma independiente. Ademas, el proyecto cuenta con
un unico recurso: el propio desarrollador. No hay equipo de redes ni de
infraestructura que pueda resolver problemas de conectividad, descubrimiento
de servicios o balanceo entre microservicios si algo falla durante la
sustentacion.

**Alternativas consideradas:**

- **Microservicios:** separacion por red de `game`, `score`, `hints`,
  `ranking`. Anade complejidad operativa (orquestacion, comunicacion,
  despliegue) sin beneficio, dado que no hay equipos distintos ni cargas
  diferenciadas que justifiquen el corte.
- **Monolito modular (elegida):** un unico proceso Fastify con carpetas por
  dominio (`matches`, `rounds`, `players`, `entities`, `scoring`, `hints`) y
  capas `routes -> services -> repositories/providers`.

**Decision:** monolito modular con limites logicos claros, documentados en
`docs/ARQUITECTURA.md` (seccion "Separacion de responsabilidades").

**Por que:** demuestra el mismo criterio de separacion de responsabilidades
que microservicios, con una fraccion del riesgo operativo. Es defendible
explicar exactamente por donde se cortaria si el proyecto necesitara
escalar (por ejemplo, extraer `hints` con su proveedor LLM como servicio
independiente si el costo/latencia de IA lo justificara). Ademas, al ser un
unico desarrollador sin soporte de redes/infraestructura, cualquier falla de
conectividad entre servicios (DNS, timeouts entre contenedores, balanceo)
seria un riesgo que nadie mas podria diagnosticar durante las 24 horas ni en
vivo durante la sustentacion.

**Consecuencias:** un unico despliegue, una unica base de datos. Si en el
futuro se necesitara escalar un modulo de forma independiente (por ejemplo,
el proveedor de IA), el limite de extraccion ya esta definido por la carpeta
`hints/` y su contrato `HintProvider`.

---

## ADR-04: Stack tecnologico backend - Node.js + TypeScript + Fastify + Prisma

**Contexto:** los analisis previos evaluaron TypeScript full-stack (Next.js +
Express/Fastify), Python (FastAPI) y "todo en un solo framework" (Next.js API
routes). Se buscaba minimizar friccion de integracion y maximizar velocidad
de desarrollo sin perder capacidad de defender el diseno de la API.

**Alternativas consideradas:**

- **Python + FastAPI:** documentacion OpenAPI automatica, fuerte para
  mostrar diseno de API, pero introduce un segundo lenguaje (backend en
  Python, frontend en TypeScript).
- **Next.js API routes como backend:** maxima velocidad de setup, pero mas
  dificil de defender la separacion "frontend consume tu backend" si no se
  estructura con una capa de servicios explicita.
- **Node.js + TypeScript + Fastify (elegida):** un solo lenguaje en todo el
  proyecto, tipado compartido, backend como proceso independiente y
  explicito (no mezclado con el frontend).

**Decision:** backend Node.js 24 + TypeScript + Fastify + Prisma + Zod.

**Por que:** un unico lenguaje reduce friccion y permite compartir criterio
de tipado; el ecosistema de SDKs de IA en TypeScript permitio integrar el
proveedor LLM (I2) sin friccion adicional; Fastify es liviano y su
manejador de errores central es facil de explicar en la sustentacion.
Backend como proceso separado hace inequivoca la separacion
frontend/backend exigida por el reto.

**Consecuencias:** no se aprovecha la generacion automatica de documentacion
OpenAPI que si ofreceria FastAPI; se compensa documentando manualmente las
rutas en `README.md` y `docs/`.

---

## ADR-05: Persistencia - PostgreSQL con Prisma y Docker Compose

**Contexto:** se necesitaba una base de datos real (no solo en memoria) para
demostrar persistencia de partidas, rondas y cache de entidades, ejecutable
localmente sin fricciones.

**Decision:** PostgreSQL 16 en contenedor Docker Compose para desarrollo,
modelado con Prisma (`Player`, `Match`, `Round`, `EntityCache`).

**Alternativas consideradas:** SQLite como plan B si Docker bloqueaba el
avance (documentado desde el analisis inicial); no fue necesario porque
Docker Desktop se instalo correctamente.

**Por que:** PostgreSQL demuestra una persistencia mas cercana a produccion
que SQLite; Prisma acelera el modelado y las migraciones, y permite
expresar restricciones de integridad (indices unicos, claves foraneas)
directamente en el esquema versionado.

**Consecuencias:** se agregaron dos restricciones a nivel de base de datos
que no estaban en el diseno inicial pero se detectaron necesarias durante la
implementacion: un indice unico parcial que impide mas de una ronda `ACTIVE`
por partida, y la clave foranea `Round.entityId -> EntityCache.entityId`.
`npm audit` reporta vulnerabilidades transitivas en dependencias de Prisma
6.19.0 (`deepmerge-ts`, `effect`); no se aplico `npm audit fix --force`
porque implicaria un cambio de version mayor no probado; queda como riesgo
pendiente a revisar antes de un uso en produccion.

---

## ADR-06: Autoridad del backend sobre el estado del juego

**Contexto:** ambos analisis coincidian en que el error mas grave posible es
permitir que el cliente controle puntaje, tiempo o resultado.

**Decision:** el cliente nunca envia puntaje, tiempo transcurrido, resultado
de una ronda ni racha. El backend calcula todo a partir de `Round.startedAt`,
el nombre real de la entidad y el estado persistido, dentro de transacciones
Prisma con aislamiento `Serializable`.

**Por que:** es la unica forma de que el puntaje sea confiable; ademas es la
pieza que el reto pide poder explicar y modificar en vivo durante la
sustentacion.

**Consecuencias:** cada operacion que cambia estado (`guess`, `finish`) usa
una actualizacion condicionada por estado esperado (`updateMany` con filtro),
para que dos solicitudes concurrentes no dupliquen puntaje ni sobrescriban un
resultado ya persistido.

---

## ADR-07: Estrategia de pistas - fallback determinista primero, LLM despues

**Contexto:** el reto exige que la IA aporte valor real y que exista un plan
B si el servicio de IA falla.

**Decision:** se implemento primero un `HintProvider` fallback determinista
(I1), basado unicamente en atributos ya cacheados (tipos, rango de tamano,
habilidad), sin red ni dependencia externa. El proveedor LLM se integro
despues (I2) detras del mismo contrato, ya asincrono
(`Promise<string>`), y el endpoint de pistas (I3) orquesta ambos: intenta el
LLM primero y usa el fallback si falla, sin exponer nunca el nombre de la
entidad.

**Por que:** garantiza que el juego funcione de punta a punta incluso sin
clave de IA configurada o si el proveedor LLM falla, cumpliendo el requisito
explicito de "plan B" antes de invertir tiempo en la integracion mas
compleja.

**Consecuencias:** las pistas de fallback son mas simples que las que genera
el LLM; se acepto ese costo porque el orden de implementacion (fallback
primero) redujo el riesgo de quedarse sin una funcionalidad de IA
demostrable si el tiempo se agotaba. `FallbackHintProvider` y
`LlmHintProvider` implementan la misma interfaz `HintProvider`, por lo que el
endpoint de pistas (I3) las usa de forma identica, sin importar cual generó
la pista.

---

## ADR-08: Abandono de ronda por tiempo

**Contexto:** el limite de tiempo por dificultad (`timeLimitMs`) solo afecta
el bonus de velocidad del puntaje; por si solo no evita que una ronda quede
`ACTIVE` indefinidamente si el jugador abandona, lo que ademas bloquearia
`POST /matches/:matchId/finish` (que exige que no exista una ronda activa).
No existe un scheduler ni un job en segundo plano: el proyecto es de un solo
desarrollador, sin infraestructura para procesos programados.

**Decision:** se establece un umbral fijo de abandono de 3 minutos
(180000 ms) por ronda, independiente de la dificultad `EASY`/`MEDIUM`/`HARD`.
Cada endpoint que opera sobre una partida (`guess`, crear ronda, `finish`)
verifica primero si la ronda `ACTIVE` supero ese umbral; si es asi, la marca
como `EXPIRED` con puntaje 0 y racha reiniciada, y finaliza la partida en la
misma transaccion, antes de continuar con la operacion solicitada.

**Por que:** al no existir un job en segundo plano, el cierre solo puede
ocurrir cuando llega una solicitud relacionada con esa partida; verificar el
abandono al inicio de cada endpoint relevante logra el mismo efecto sin
agregar infraestructura. Un umbral fijo, independiente de la dificultad,
es mas simple de razonar y de defender que uno variable, y evita mezclar
dos conceptos distintos: el bonus de velocidad (por dificultad) y el
abandono de partida (fijo).

**Consecuencias:** una partida abandonada se cierra automaticamente en la
siguiente interaccion relacionada, evitando partidas huerfanas bloqueadas
para siempre. El estado `RoundStatus.EXPIRED`, ya definido en el esquema,
se usa por primera vez con este proposito.

---

## ADR-09: Bucle de juego, modos y orden de implementacion

**Contexto:** el reto exige un bucle completo: presentar una entidad oculta,
adivinar con limite de tiempo, pedir hasta tres pistas de IA, resolver,
adaptar dificultad y persistir el resultado para el ranking. El proyecto ya
cuenta con la base de partidas, rondas, puntaje, racha y proveedor LLM, pero
I3, la obfuscacion server-side, los modos, la dificultad, la interfaz y el
ranking pertenecen a historias distintas.

**Decision:** se mantienen dos tiempos independientes: 30 segundos para el
bonus de velocidad y 3 minutos para abandono. Se implementan dos modos:
`STANDARD`, con maximo de 10 rondas, y `STREAK`, que continua hasta el primer
fallo o abandono. El backend aplica todas las reglas y el frontend solo las
representa.

El orden aprobado es: I3; correccion transversal de G2 para obfuscacion
server-side; HU tecnica de modos con migracion; D1; U1; U2; U3; Q1/Q2; y
documentacion final.

La regla de puntuacion vigente se conserva: base 100, bonus de velocidad,
penalizacion actual por `hintsUsed` y multiplicador de racha. La alternativa
100/50/20 se descarta y no se implementa en esta etapa.

**Por que:** separa el nucleo jugable de la presentacion, permite cerrar I3
sin mezclar frontend o ranking y hace explicitas las dependencias. La
expiracion reutilizable se conecta a todos los endpoints que tocan la partida
para que el abandono no deje partidas bloqueadas.

**Consecuencias:** G2 recibira una correccion server-side; los modos requieren
una migracion y afectan G1/U1; D1 solo ajusta dificultad; U3 incorpora el
ranking; Q1/Q2 validan el flujo completo. Hasta terminar esas historias, el
bucle se considera parcialmente implementado.

---

## ADR-10: Obfuscacion de imagen server-side con Sharp

**Contexto:** el proxy de imagen de G2 ocultaba el identificador externo, pero
devolvia el artwork original. Un filtro aplicado solo en frontend permitiria
recuperar la imagen sin ocultacion y revelaria la entidad antes de resolver.

**Decision:** el backend procesa el buffer en memoria con Sharp. Para una
ronda `ACTIVE` entrega PNG sin metadata, en escala de grises, reducido y con
blur fijo. Para una ronda `RESOLVED` entrega la imagen original por la misma
ruta. Para una ronda `EXPIRED` responde `409` sin revelar imagen ni entidad.

**Por que:** Sharp es compatible con Node 24, procesa buffers eficientemente
en Windows y evita persistir una segunda copia. Jimp se descarto por menor
rendimiento; CSS/frontend se descarto porque expondria el artwork original;
Canvas agrega complejidad nativa sin una ventaja proporcional.

**Consecuencias:** `GET /rounds/:roundId/image` conserva su contrato de ruta,
pero siempre entrega `image/png` mientras la ronda esta activa. La revelacion
posterior usa la misma URL y el estado ya persistido de la ronda.

---

## ADR-11: Modos de partida persistidos en Match

**Contexto:** el bucle del juego permite una partida de 10 rondas o una racha
infinita hasta el primer fallo. Un limite global de 10 rondas no representa el
modo de racha y deja al frontend sin autoridad para conocer cuando una partida
termina automaticamente.

**Decision:** `Match.gameMode` usa el enum `GameMode` con `STANDARD` como
default y `STREAK` como alternativa. `STANDARD` finaliza en la ronda 10;
`STREAK` finaliza al primer fallo. Ambos modos finalizan por abandono. La
respuesta de `guess` incluye `matchStatus` y `gameMode`.

**Por que:** persistir la decision en la partida permite que el backend aplique
las reglas dentro de la misma transaccion que resuelve la ronda, evita que el
cliente decida continuar y mantiene las partidas existentes compatibles con el
default `STANDARD`.

**Consecuencias:** se agrega una migracion Prisma sin tabla adicional. Crear
partida acepta `gameMode` opcional. Crear ronda limita solo `STANDARD`; una
partida `FINISHED` bloquea nuevas rondas en ambos modos.

---

## Evolucion futura del producto

Ideas que van mas alla del alcance de la prueba tecnica, para un contexto de
producto real:

- **Eleccion de categoria de personaje:** permitir que el jugador elija entre
  familias de PokeAPI (por ejemplo, por generacion o tipo dominante) en vez
  de un rango fijo de IDs para `EASY`, dando control sobre el estilo de
  partida.
- **Soporte multi-API:** implementar tambien el adaptador Marvel detras de
  `CharacterProvider` y permitir elegir la fuente por partida o por
  configuracion, aprovechando que el proveedor ya esta desacoplado del
  dominio.
- **Perfiles y autenticacion real:** reemplazar el alias libre por cuentas
  persistentes, con historial de partidas por usuario.
- **Ranking publico y estadisticas:** endpoint de ranking global, filtros por
  periodo y estadisticas por jugador (mejor racha, tiempo promedio).
- **Cache distribuido:** sustituir la tabla `EntityCache` por un cache
  compartido (Redis) si el volumen de partidas concurrentes lo justificara.
- Actualizar Prisma para resolver las vulnerabilidades transitivas
  reportadas por `npm audit` sin romper la configuracion actual de
  `DATABASE_URL`.

## Limitaciones conocidas

- No hay autenticacion de usuarios: un alias identifica al jugador, sin
  cuentas ni contrasena. Es una decision de alcance, no una funcionalidad
  faltante.
- El umbral de abandono de ronda (3 minutos) es fijo y no varia por
  dificultad; es una decision deliberada de simplicidad (ver ADR-08).
- El ranking se calcula como una consulta sobre partidas `FINISHED`, sin una
  tabla dedicada: es una decision de modelado, no una limitacion de
  funcionalidad.
