# Instrucciones del proyecto

## Marcadores IMPORTANTES

Cuando el usuario escriba `IMPORTANTE`, `IMPORTANTE!` o `IMPORTANTE!!!`:

1. Tratarlo como una instruccion prioritaria para la tarea actual.
2. Registrarlo en `AI_USAGE.md` antes de cerrar la historia de usuario afectada.
3. Indicar en el registro la decision o cambio que produjo.
4. No ignorarlo ni interpretarlo como un comentario decorativo.

## Invariantes del bucle de juego

- El backend es la autoridad sobre tiempo, estado, puntaje, racha, dificultad,
	modo de partida y finalizacion.
- La imagen de una entidad llega al cliente obfuscada desde el backend; nunca
	se entrega el artwork original.
- Se mantienen dos tiempos independientes: 30 segundos para el bonus de
	velocidad y 3 minutos para abandono.
- Despues de 30 segundos la ronda sigue activa, pero no obtiene bonus adicional
	de velocidad; despues de 3 minutos pasa a `EXPIRED` y termina la partida.
- El modo `STANDARD` tiene un maximo de 10 rondas; `STREAK` continua hasta el
	primer fallo o abandono.
- Una ronda permite como maximo 3 pistas y el flujo intenta primero el LLM;
	usa el fallback ante error, timeout, spoiler o salida invalida.
- Ningun proveedor de pistas recibe `entityName`, `entityId`, imagen, intento
	del jugador ni secretos.
- Una ronda `RESOLVED` o `EXPIRED` y una partida `FINISHED` no aceptan nuevas
	acciones.
- El cliente nunca calcula ni envia puntaje, tiempo oficial, resultado o racha.
- Toda regla implementada debe tener pruebas y reflejarse en `DECISIONS.md` y
	`docs/FLUJO_JUEGO.md`.

## Orden aprobado de trabajo

1. I3: endpoint de pistas, LLM/fallback, limite 3, persistencia, penalizacion y expiracion reutilizable.
2. Correccion transversal de G2: obfuscacion real server-side.
3. HU tecnica de modos: `STANDARD` y `STREAK`, incluyendo migracion.
4. D1: dificultad adaptativa.
5. U1: seleccion de modo al iniciar.
6. U2: pantalla completa de ronda.
7. U3: resultado y ranking.
8. Q1/Q2: pruebas de dominio, integracion y flujo completo.
9. Documentacion final: ADRs, flujo, README y bitacora.