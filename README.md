# Life OS

Life OS is a self-hosted dashboard for running your whole life from one place. It brings goals,
daily tasks, habits, studies, work, health, money and personal notes into a single app, so you
don't have to keep them in separate tools.

It is built for one person and runs on your own machine. There are no accounts or subscriptions.
Your data lives in your own PostgreSQL database, and the app starts completely empty.

## What it does

Most planning tools stop at a to-do list. Life OS covers the full loop:

1. **Plan:** set yearly, quarterly, monthly and weekly goals, or let AI turn a written plan into
   goals and tasks.
2. **Execute:** see today's priorities, due tasks and habits on one screen.
3. **Track:** log study hours, training, language practice, sales leads, job applications and trades.
4. **Review:** write daily journal entries and weekly reviews.
5. **Analyze:** see your activity across every area in charts and a heatmap.

## Modules

### Core

| Module | What it's for |
| --- | --- |
| **Command** | Home screen with today's priorities, active goals, weekly habits, key numbers and items that have gone stale |
| **Master Roadmap** | All open goals by priority and deadline, plus a year timeline |
| **AI Plan** | Upload a roadmap PDF or paste a plan, then review the generated goals and tasks before saving them |
| **Calendar** | Events, tasks, goals and exams in one calendar, with a list of what's coming up |
| **Analytics** | Execution heatmap, life balance radar and training volume, all calculated from your data |

### Work and study

| Module | What it's for |
| --- | --- |
| **University** | Courses, assignments, exams and study hours against your targets |
| **Skill Tree** | Skills mapped by prerequisites, with levels you back up with projects |
| **Business** | Sales pipeline with drag-and-drop stages, outreach, revenue and business ideas |
| **Career** | Job and internship applications, from researching a role to getting an offer |

### Health and money

| Module | What it's for |
| --- | --- |
| **Fitness** | Training sessions, personal records, bodyweight and training volume |
| **Languages** | The languages you're learning, your CEFR level in each, and practice sessions |
| **Finance** | Trade journal, strategies, equity curve and a monthly trade calendar |

### Knowledge and reflection

| Module | What it's for |
| --- | --- |
| **Personal Brand** | Content kanban, from idea to posted, organized around your brand pillars |
| **Reading** | Books you're reading, finished or planning to read, with notes and ratings |
| **Journal** | Daily entries and weekly reviews |
| **Idea Notebook** | Quick capture for ideas, which you can tag and rate later |

## Other features

- **Command palette:** press `⌘K` or `Ctrl+K` to search, jump to a module or create an item.
- **Instant saving:** changes appear right away. If the API can't be reached, they are kept in the
  browser and retried automatically.
- **Backup and restore:** export everything to a JSON file and restore it later from the Data menu.
- **Daily snapshots:** `npm run snapshot` in `server/` saves a JSON backup to `~/Backups/lifeos` and
  removes backups older than 7 days. You can schedule it with launchd or cron.
- **List tools:** sorting, filtering, pagination and bulk actions on list views.
- **Installable and responsive:** works on mobile and includes a web app manifest.

## AI features (optional)

Life OS works fully without AI. Adding an Anthropic API key turns on two extras:

- **Daily brief:** a three-line summary on the home screen covering your biggest priority, the main
  risk and one signal about your momentum.
- **Plan import:** turns a pasted plan or PDF into goals and day-by-day tasks.

To enable them, set `ANTHROPIC_API_KEY` in `server/.env` and restart the API.

The key stays on the server and is never sent to the browser. When you use these features, the
relevant data is sent to the Anthropic API: a summary of your current data for the brief, and your
plan text or PDF for plan import. No other app data leaves your machine. The web app does load its
fonts from Google Fonts.

## Getting started

You need [Node.js](https://nodejs.org) and [Docker](https://www.docker.com).

**1. Clone the repo and start the database**

```bash
git clone https://github.com/jojo594/life-os.git
cd life-os
cp .env.example .env
docker compose up -d
```

**2. Start the API**

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

**3. Start the web app in a second terminal, from the project root**

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:4000.

The default database password in `.env.example` is for local development only. Change it if you
expose the database or run the app anywhere other than your own machine, and note that the API has
no login of its own.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL 16, running in Docker |
| AI | Anthropic API |

## Useful commands

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | root | Starts the web app |
| `npm run build` | root | Type-checks and builds the web app |
| `npm run lint` | root | Runs ESLint |
| `npm run dev` | `server/` | Starts the API with auto-reload |
| `npm run prisma:migrate` | `server/` | Creates and applies a migration after a schema change |
| `npm run prisma:studio` | `server/` | Opens a database browser |
| `npm run snapshot` | `server/` | Saves a JSON backup |
| `docker compose stop` | root | Stops the database and keeps your data |
| `docker compose down -v` | root | **Deletes the database and all your data** |
