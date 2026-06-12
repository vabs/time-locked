# Time Locked

A decision journal that forces deliberate thinking. Write down a decision, lock it behind a timer, and let time do the work. When the timer expires you get notified — and you've had the space to think it through.

## Why

Most bad decisions happen fast. Time Locked adds friction by design: you can't act on a decision until you've sat with it. While the timer runs, you document every new thought, concern, or idea that surfaces. By the time the lock opens, you have a richer picture — and a record of how you got there.

## Features

- **Decision timer** — lock any decision behind a minimum 1-hour countdown
- **Timer presets** — 1 hour, 6 hours, 24 hours, 3 days, 1 week
- **Pause / Resume** — freeze the countdown without losing elapsed time
- **Stop with confirmation** — abandon a decision (archived, not deleted)
- **Notes** — add thoughts at any point while the timer is running
- **Outcome recording** — once the timer expires, record what you decided
- **Tags** — categorise decisions with system tags (Financial, Career, Health, Relationship, Personal, Work) or create your own
- **Push notifications** — get notified when your timer expires, even with the tab closed
- **Decision history** — browse expired and stopped decisions, filterable by status
- **PWA** — installable on desktop and mobile, works offline

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| PWA | vite-plugin-pwa, Web Push API |
| Auth | Clerk (Google, Facebook, email/password) |
| Backend | Node.js, Express v5, TypeScript |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Push | Web Push (VAPID) |
| Scheduler | node-cron (polls every 30s for expired timers) |
| Deploy | Docker (single container) |

## Project Structure

```
time-locked/
├── frontend/               React PWA
│   ├── src/
│   │   ├── components/     Layout, TimerDisplay, DecisionCard, ConfirmDialog
│   │   ├── pages/          Dashboard, NewDecision, DecisionDetail, History, Settings
│   │   └── lib/            API client, push helper, timer utilities
│   └── public/sw.js        Service worker for push notifications
├── backend/                Express API
│   └── src/
│       ├── db/             Drizzle schema, migrations, system tag seed
│       ├── middleware/     Clerk auth guard
│       ├── routes/         decisions, notes, tags, push
│       └── services/       VAPID push sender, 30s cron scheduler
├── Dockerfile              Single-container build
├── docker-compose.yml      Production compose with persistent SQLite volume
└── mprocs.yml              Dev process manager config
```

## Database Schema

```
decisions       id, user_id, title, description, timer_duration,
                timer_started_at, timer_paused_at, time_elapsed_before_pause,
                status (running|paused|expired|stopped), outcome,
                created_at, updated_at

notes           id, decision_id, content, created_at

tags            id, user_id (null = system), name, color, is_system

decision_tags   decision_id, tag_id

push_subscriptions  id, user_id, endpoint, p256dh, auth, created_at
```

## Timer Lifecycle

```
created → running ──► paused ──► running
                  └──► stopped (archived)
                  └──► expired → outcome recorded
```

- Pausing freezes elapsed time; countdown resumes from where it left off
- Stopping requires confirmation; decision is archived not deleted
- Expired decisions accept an outcome and remain in history permanently

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### 1. Clone and install

```bash
git clone <repo-url>
cd time-locked
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env`:

```env
PORT=3001
DATABASE_URL=./data/time-locked.db
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
VAPID_EMAIL=you@example.com
VAPID_PUBLIC_KEY=          # see below
VAPID_PRIVATE_KEY=         # see below
```

Fill in `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

Get your Clerk keys from [dashboard.clerk.com](https://dashboard.clerk.com).

### 3. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Paste the output into `backend/.env`.

### 4. Run migrations

```bash
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed    # optional: seeds system tags
cd ..
```

### 5. Start development

```bash
mprocs          # recommended — shows backend and frontend in split panes
# or
npm run dev     # runs both via concurrently
```

Frontend → http://localhost:5173  
Backend API → http://localhost:3001

## Production (Docker)

```bash
docker compose up -d --build
```

SQLite data persists in a named Docker volume (`db-data`). Set all env vars from `backend/.env.example` in your deployment environment before running.

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/decisions` | List decisions (filter: `?status=running\|paused\|expired\|stopped`) |
| `POST` | `/api/decisions` | Create decision |
| `GET` | `/api/decisions/:id` | Get decision with notes and tags |
| `PATCH` | `/api/decisions/:id/pause` | Pause running decision |
| `PATCH` | `/api/decisions/:id/resume` | Resume paused decision |
| `PATCH` | `/api/decisions/:id/stop` | Stop decision (archived) |
| `PATCH` | `/api/decisions/:id/outcome` | Record outcome on expired decision |
| `POST` | `/api/decisions/:id/notes` | Add note |
| `DELETE` | `/api/decisions/:id/notes/:noteId` | Delete note |
| `GET` | `/api/tags` | List tags (system + user) |
| `POST` | `/api/tags` | Create user tag |
| `DELETE` | `/api/tags/:id` | Delete user tag |
| `GET` | `/api/push/vapid-public-key` | Get VAPID public key |
| `POST` | `/api/push/subscribe` | Register push subscription |
| `DELETE` | `/api/push/unsubscribe` | Remove push subscription |

## CLI

The Time Locked CLI is available as the `@time-locked/cli` workspace package.

```bash
npm run build -w cli
npm run dev -w cli -- --help
```

The CLI talks to the backend API. It does not read or write the SQLite database directly.

Basic usage:

```bash
npm run dev -w cli -- login --api-url http://localhost:3001
npm run dev -w cli -- decisions create
npm run dev -w cli -- decisions list --active
```

CLI login requires the backend to expose public Clerk OAuth config:

```env
CLERK_OAUTH_ISSUER_URL=
CLERK_OAUTH_CLIENT_ID=
```

## Roadmap

- [ ] CLI client
- [ ] Mobile app (iOS / Android)
- [ ] Decision insights / stats view

## License

GPL-3.0
