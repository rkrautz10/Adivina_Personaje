# Adivina Personaje

Juego web de adivinanza de personajes basado en PokéAPI. El frontend consume un
backend propio, que sera responsable de las reglas de juego, puntaje,
persistencia, pistas IA y dificultad adaptativa.

## Stack

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, TypeScript y Fastify.
- Persistencia planificada: PostgreSQL y Prisma.

## Requisitos locales

- Node.js LTS 24 o superior y npm.
- PostgreSQL local o Docker Desktop con WSL 2 para las historias de persistencia.

## Ejecucion

Primero, desde la raiz, crea los archivos locales de configuracion y levanta
PostgreSQL:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
docker compose up -d
docker compose ps
```

Genera Prisma Client y aplica la migracion inicial:

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate -- --name init
```

En dos terminales:

```powershell
cd frontend
npm install
npm run dev
```

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

El backend expone `GET http://localhost:3001/health` para comprobar el arranque.
La configuracion valida `DATABASE_URL` y `FRONTEND_ORIGIN` al iniciar; el
servidor no arranca si falta alguna de estas variables requeridas.

## Rutas disponibles

- `POST /matches`: crea una partida para un alias valido.
- `POST /matches/:matchId/rounds`: crea una ronda con una entidad oculta.
- `GET /rounds/:roundId/image`: entrega la imagen mediante el backend, sin
	exponer el identificador de PokéAPI.

## Variables de entorno

Copiar los archivos `.env.example` a `.env` en la raiz y en cada aplicacion.
No subir archivos `.env` ni claves reales al repositorio. Las credenciales de
PostgreSQL incluidas en los ejemplos son exclusivamente para desarrollo local.
