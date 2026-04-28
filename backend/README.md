# Cloudflare DNS Fetcher Backend

Fastify backend using TypeScript, MongoDB, dotenv, and jsonwebtoken.

## Requirements

- Node.js `25.9.0` or newer
- npm `11.12.1` or newer
- MongoDB running locally or a MongoDB connection string

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The backend builds the frontend first, then serves it from `http://localhost:7000`.
Backend API routes are available under `http://localhost:7000/api`.

## Scripts

- `npm run build:frontend` builds the Vite frontend into `../frontend/dist`.
- `npm run dev` builds the frontend, then starts the TypeScript dev server with watch mode.
- `npm run build` builds the frontend and compiles TypeScript into `dist`.
- `npm start` builds the frontend, then runs the compiled backend.
- `npm run typecheck` checks TypeScript without emitting files.

## Endpoints

- `GET /api/health` checks API and MongoDB connectivity.
- `POST /api/auth/token` creates a JWT for a provided `subject`.
