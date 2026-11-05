# Life OS

A self-hosted personal dashboard for goals, tasks, habits, university, business, career,
skills, fitness, languages, finance, content, reading and journaling. It starts empty.

**Stack:** React, Vite, TypeScript, Tailwind and Zustand on the frontend; Express, Prisma and
PostgreSQL on the backend.

## Run it

```bash
cp .env.example .env
docker compose up -d
npm install
cd server && cp .env.example .env && npm install && npx prisma migrate deploy && npm run dev
```

In a second terminal, from the project root:

```bash
npm run dev
```

The web app runs on http://localhost:5173 and the API on http://localhost:4000.

## Optional AI features

The daily brief and plan import use the Anthropic API. To enable them, set `ANTHROPIC_API_KEY`
in `server/.env`.
