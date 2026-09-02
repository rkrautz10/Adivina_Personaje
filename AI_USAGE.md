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