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

## Variables de entorno

Copiar los archivos `.env.example` a `.env` en cada aplicacion. No subir archivos
`.env` ni claves reales al repositorio.
