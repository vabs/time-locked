# Time Locked CLI Application Design

## Purpose

Build a first-party command-line companion for Time Locked. The CLI lets a user manage decisions from a terminal while keeping all domain behavior in the existing backend API.

The CLI is an API client, not a database tool. It must not read or write SQLite directly. Auth, ownership checks, timer lifecycle rules, tag validation, and scheduler behavior remain centralized in the backend.

## Current Project Context

The project is an npm workspace with two existing packages:

- `frontend/`: React/Vite PWA using Clerk for browser auth.
- `backend/`: Express API using Clerk middleware, Drizzle, SQLite, and a scheduler for timer expiry.

The CLI will be added as a third workspace:

- `cli/`: TypeScript Node CLI, built and tested independently, consuming the backend REST API.

## Recommended Architecture

Create `cli/` as a TypeScript npm workspace package with this structure:

```text
cli/
  src/
    index.ts
    commands/
      auth.ts
      decisions.ts
      notes.ts
    lib/
      api-client.ts
      auth.ts
      config.ts
      durations.ts
      format.ts
      tags.ts
```

Responsibilities:

- `index.ts`: command parser entrypoint and global options.
- `commands/auth.ts`: `login`, `logout`, `whoami`.
- `commands/decisions.ts`: list, create, show, pause, resume, stop, outcome.
- `commands/notes.ts`: add note.
- `lib/api-client.ts`: authenticated fetch wrapper, token refresh, error mapping.
- `lib/auth.ts`: Clerk OAuth authorization-code + PKCE login flow.
- `lib/config.ts`: API URL and token storage.
- `lib/durations.ts`: parse `1h`, `24h`, `3d`, `1w` into seconds.
- `lib/format.ts`: tables, details, dates, colors, JSON output.
- `lib/tags.ts`: resolve tag names/IDs and detect unknown or ambiguous tags.

Recommended packages:

- CLI parser: `commander`
- Prompts: `@inquirer/prompts`
- Table output: small custom formatter first; add a package only if needed
- Config directory: `env-paths` or equivalent
- Browser opener: `open`
- Tests: Node test runner with `tsx`, matching the backend test style

## Authentication Design

The CLI uses browser-based login with Clerk OAuth authorization-code flow and PKCE.

Clerk verification:

- Clerk OAuth applications expose an `authorizeUrl`, `tokenFetchUrl`, and discovery URL.
- Clerk supports public OAuth clients where PKCE can be used.
- Clerk authorization server metadata lists `authorization_code` and `refresh_token` grant types.
- Clerk access tokens expire after 1 day, and refresh tokens do not expire.
- No official evidence was found for OAuth device authorization grant support, so the CLI will not use device-code login for MVP.

References:

- https://clerk.com/docs/reference/backend/oauth-applications/create
- https://clerk.com/docs/reference/backend/types/backend-oauth-application
- https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth

Login flow:

1. User runs `time-locked login --api-url <url>`.
2. CLI fetches public auth configuration from the Time Locked backend.
3. CLI generates a PKCE verifier/challenge and starts a temporary localhost callback server.
4. CLI opens the Clerk authorization URL in the browser.
5. User authenticates in the browser.
6. Clerk redirects to the localhost callback with an authorization code.
7. CLI exchanges the code for access and refresh tokens.
8. CLI stores the API URL and tokens locally.

Backend additions required:

- `GET /api/auth/config`: public endpoint returning the OAuth issuer/client configuration needed by the CLI.
- `GET /api/me`: authenticated endpoint returning a lightweight identity summary for `whoami`.

Token handling:

- API calls attach `Authorization: Bearer <access_token>`.
- If the token is expired or rejected, the API client refreshes once and retries.
- `logout` clears stored tokens.
- `whoami` calls `GET /api/me`.

Token storage:

- Prefer OS keychain through a package such as `keytar` if practical.
- Fallback to a file in the user config directory with restrictive permissions and a warning.
- Example config paths:
  - macOS/Linux: `~/.config/time-locked/config.json`
  - Windows: `%APPDATA%/time-locked/config.json`

## Command Surface

MVP commands:

```bash
time-locked login
time-locked logout
time-locked whoami

time-locked decisions list
time-locked decisions list --active
time-locked decisions list --history
time-locked decisions list --status running

time-locked decisions create
time-locked decisions create --title "..." --duration 24h --tag Career

time-locked decisions show <id>
time-locked decisions pause <id>
time-locked decisions resume <id>
time-locked decisions stop <id>
time-locked decisions outcome <id> --text "I decided to wait"

time-locked notes add <decision-id>
time-locked notes add <decision-id> --text "New concern surfaced"
```

Global options:

```bash
--api-url <url>    Override configured API URL
--json             Print machine-readable JSON
--no-color         Disable color
```

## `decision create` Design

`decision create` is a hybrid interactive command.

Interactive use:

```bash
time-locked decisions create
```

Prompt flow:

```text
Title: Should I accept the new role?
Context: Higher pay, longer commute, less clear manager fit.
Duration:
  1. 1 hour
  2. 6 hours
  3. 24 hours
  4. 3 days
  5. 1 week
Tags: Career, Financial
Create and start timer now? yes
```

Flag-driven use:

```bash
time-locked decisions create \
  --title "Should I accept the new role?" \
  --description "Higher pay, longer commute, less clear manager fit." \
  --duration 24h \
  --tag Career \
  --tag Financial
```

Hybrid behavior:

- Flags provide initial values.
- Missing required values are prompted.
- Missing optional values may be skipped interactively.
- The command confirms before creating because the timer starts immediately.
- `--yes` can skip confirmation for scripted use.

Validation:

- Title is required and trimmed.
- Description is optional and trimmed.
- Duration accepts presets and readable values: `1h`, `6h`, `24h`, `3d`, `1w`.
- Duration must be at least 1 hour.
- Tags are fetched from `GET /api/tags`.
- Tag flags resolve by exact name or ID.
- Unknown tags produce an error that lists available tag names.
- Ambiguous tag names require using the tag ID.

API call:

- `POST /api/decisions`
- Payload: `title`, `description`, `timerDuration`, `tagIds`
- The backend remains responsible for final validation and ownership enforcement.

Success output:

```text
Created decision abc123
Should I accept the new role?
Status: running
Unlocks: in 24h
Tags: Career, Financial
```

## Output And Error UX

Default output is human-readable. `--json` prints machine-readable API-shaped data with minimal formatting.

List output:

```text
ID        Status    Unlocks     Title
abc123    running   23h 12m     Should I accept the new role?
def456    paused    2d 4h       Buy the camera?
```

Detail output:

```text
Should I accept the new role?
Status: running
Unlocks: in 23h 12m
Tags: Career, Financial

Context
Higher pay, longer commute, unclear manager fit.

Notes
[2026-06-10 09:14] Concern: commute will affect mornings.
```

Error behavior:

- Not logged in: `Run time-locked login first.`
- Expired token: refresh silently once, then retry.
- Backend validation: print the backend error plainly.
- Unknown tag: print available tag names.
- Ambiguous tag: require exact ID.
- `decisions stop`: prompt unless `--yes` is passed.
- Network failure: print API URL and a concise connection error.

## Backend API Changes

Required backend additions:

- `GET /api/auth/config`
  - Public.
  - Returns OAuth issuer/client configuration for CLI login.
  - Must not expose secrets.

- `GET /api/me`
  - Authenticated.
  - Returns the current Clerk user ID and any safe display fields available from auth claims.

Existing endpoints reused:

- `GET /api/decisions`
- `POST /api/decisions`
- `GET /api/decisions/:id`
- `PATCH /api/decisions/:id/pause`
- `PATCH /api/decisions/:id/resume`
- `PATCH /api/decisions/:id/stop`
- `PATCH /api/decisions/:id/outcome`
- `POST /api/decisions/:id/notes`
- `GET /api/tags`

## Testing Plan

Unit tests:

- Duration parsing:
  - `1h`, `24h`, `3d`, `1w`
  - invalid values
  - values below 1 hour
- Tag resolution:
  - exact name
  - tag ID
  - unknown names
  - ambiguous names
- API client:
  - attaches access token
  - refreshes once on auth failure
  - does not retry forever
  - formats backend errors
- Config:
  - reads/writes with a test config path
  - clears tokens on logout
- Command parsing:
  - `decisions create` flags map to expected payload
  - missing values trigger prompt boundaries through injectable prompt functions

CLI command tests:

- Mock `fetch`.
- Run commands through the parser.
- Assert stdout/stderr and API request payloads.

Manual smoke tests:

1. Start backend locally.
2. Run `time-locked login`.
3. Create a decision interactively.
4. List active decisions.
5. Show the created decision.
6. Add a note.
7. Pause and resume.
8. Stop with confirmation.

## Non-Goals For MVP

- Push notifications from the CLI.
- Offline mode.
- Direct SQLite access.
- Creating tags from `decision create`.
- Full account/profile management.
- Shell completions.
- Publishing to npm/Homebrew.
- Device-code login.

## OAuth Configuration Constraint

`GET /api/auth/config` must read public OAuth configuration from backend environment variables:

- `CLERK_OAUTH_ISSUER_URL`
- `CLERK_OAUTH_CLIENT_ID`

The endpoint returns those values and no secrets. The CLI uses `CLERK_OAUTH_ISSUER_URL` to fetch Clerk authorization server metadata and discover the authorization and token endpoints. This keeps secret material out of the API response while avoiding hardcoded Clerk URLs in the CLI.
