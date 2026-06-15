# CLI Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-party `time-locked` CLI that authenticates through Clerk OAuth + PKCE and manages decisions through the existing backend API.

**Architecture:** Add `cli/` as a third npm workspace package. The CLI is a TypeScript Node API client; it never reads or writes SQLite directly. Add two small backend endpoints for public CLI auth configuration and `whoami`, then implement CLI libraries and commands in focused slices.

**Tech Stack:** Node 22, TypeScript, npm workspaces, Express, Clerk, Commander, `@inquirer/prompts`, `env-paths`, `open`, Node test runner, `tsx`.

---

## File Structure

Create or modify these files:

- Modify: `package.json` to add the `cli` workspace.
- Create: `cli/package.json` for CLI scripts, dependencies, and `bin`.
- Create: `cli/tsconfig.json` for CLI TypeScript compilation.
- Create: `cli/src/index.ts` as the command parser entrypoint.
- Create: `cli/src/commands/auth.ts` for `login`, `logout`, `whoami`.
- Create: `cli/src/commands/decisions.ts` for decision commands.
- Create: `cli/src/commands/notes.ts` for note commands.
- Create: `cli/src/lib/api-client.ts` for authenticated requests and refresh retry.
- Create: `cli/src/lib/auth.ts` for PKCE, metadata discovery, browser login, token exchange.
- Create: `cli/src/lib/config.ts` for API URL and token persistence.
- Create: `cli/src/lib/durations.ts` for duration parsing and formatting.
- Create: `cli/src/lib/format.ts` for table/detail output and JSON switching.
- Create: `cli/src/lib/tags.ts` for tag name/ID resolution.
- Create: `cli/test/*.test.ts` for unit and command tests.
- Create: `backend/src/services/authConfig.ts` for public OAuth config validation.
- Create: `backend/src/routes/auth.ts` for `GET /api/auth/config`.
- Create: `backend/src/routes/me.ts` for `GET /api/me`.
- Modify: `backend/src/index.ts` to mount the new backend routes.
- Modify: `backend/.env.example` and `docker-compose.yml` to document/pass public OAuth values.
- Modify: `README.md` to document basic CLI development and usage.

Keep files small. Do not merge command logic into `cli/src/index.ts`.

---

### Task 1: Backend CLI Auth Support

**Files:**
- Create: `backend/src/services/authConfig.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/routes/me.ts`
- Create: `backend/test/authConfig.test.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Write the failing backend auth config tests**

Create `backend/test/authConfig.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getCliAuthConfigFromEnv } from "../src/services/authConfig.js";

test("returns public CLI OAuth config from environment", () => {
  const config = getCliAuthConfigFromEnv({
    CLERK_OAUTH_ISSUER_URL: "https://example.accounts.dev",
    CLERK_OAUTH_CLIENT_ID: "oauth_client_123",
  });

  assert.deepEqual(config, {
    issuerUrl: "https://example.accounts.dev",
    clientId: "oauth_client_123",
    redirectUriPattern: "http://127.0.0.1:{port}/callback",
    scopes: ["openid", "profile", "email", "offline_access"],
  });
});

test("throws when issuer URL is missing", () => {
  assert.throws(
    () =>
      getCliAuthConfigFromEnv({
        CLERK_OAUTH_CLIENT_ID: "oauth_client_123",
      }),
    /Missing CLERK_OAUTH_ISSUER_URL/
  );
});

test("throws when client ID is missing", () => {
  assert.throws(
    () =>
      getCliAuthConfigFromEnv({
        CLERK_OAUTH_ISSUER_URL: "https://example.accounts.dev",
      }),
    /Missing CLERK_OAUTH_CLIENT_ID/
  );
});
```

- [ ] **Step 2: Run the backend tests to verify red**

Run:

```bash
npm test -w backend
```

Expected: fail with `Cannot find module .../backend/src/services/authConfig.js`.

- [ ] **Step 3: Implement auth config service**

Create `backend/src/services/authConfig.ts`:

```ts
export interface CliAuthConfig {
  issuerUrl: string;
  clientId: string;
  redirectUriPattern: "http://127.0.0.1:{port}/callback";
  scopes: ["openid", "profile", "email", "offline_access"];
}

export function getCliAuthConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): CliAuthConfig {
  const issuerUrl = env.CLERK_OAUTH_ISSUER_URL;
  if (!issuerUrl) {
    throw new Error("Missing CLERK_OAUTH_ISSUER_URL");
  }

  const clientId = env.CLERK_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing CLERK_OAUTH_CLIENT_ID");
  }

  return {
    issuerUrl,
    clientId,
    redirectUriPattern: "http://127.0.0.1:{port}/callback",
    scopes: ["openid", "profile", "email", "offline_access"],
  };
}
```

- [ ] **Step 4: Run backend tests to verify green**

Run:

```bash
npm test -w backend
```

Expected: all backend tests pass.

- [ ] **Step 5: Add backend routes**

Create `backend/src/routes/auth.ts`:

```ts
import { Router } from "express";
import { getCliAuthConfigFromEnv } from "../services/authConfig.js";

const router = Router();

router.get("/config", (_req, res) => {
  try {
    res.json(getCliAuthConfigFromEnv());
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "CLI auth is not configured",
    });
  }
});

export default router;
```

Create `backend/src/routes/me.ts`:

```ts
import { getAuth } from "@clerk/express";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const auth = getAuth(req);
  res.json({
    userId: auth.userId,
    sessionId: auth.sessionId ?? null,
  });
});

export default router;
```

Modify `backend/src/index.ts` imports:

```ts
import authRouter from "./routes/auth.js";
import meRouter from "./routes/me.js";
```

Mount the routes before the existing API routers:

```ts
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
```

- [ ] **Step 6: Document backend environment**

Add to `backend/.env.example`:

```env
# Public OAuth app config for CLI login
CLERK_OAUTH_ISSUER_URL=
CLERK_OAUTH_CLIENT_ID=
```

Add to `docker-compose.yml` environment:

```yaml
      CLERK_OAUTH_ISSUER_URL: ${CLERK_OAUTH_ISSUER_URL}
      CLERK_OAUTH_CLIENT_ID: ${CLERK_OAUTH_CLIENT_ID}
```

- [ ] **Step 7: Verify backend build**

Run:

```bash
npm run build -w backend
```

Expected: TypeScript exits 0.

- [ ] **Step 8: Commit backend support**

```bash
git add backend/src/services/authConfig.ts backend/src/routes/auth.ts backend/src/routes/me.ts backend/src/index.ts backend/.env.example docker-compose.yml backend/test/authConfig.test.ts
git commit -m "Add backend CLI auth endpoints"
```

---

### Task 2: CLI Workspace Scaffold

**Files:**
- Modify: `package.json`
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`
- Create: `cli/test/cli.test.ts`

- [ ] **Step 1: Add the workspace entry**

Modify root `package.json` workspaces:

```json
"workspaces": [
  "frontend",
  "backend",
  "cli"
]
```

- [ ] **Step 2: Create CLI package files**

Create `cli/package.json`:

```json
{
  "name": "@time-locked/cli",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "time-locked": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "node --import tsx --test test/*.test.ts"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "commander": "^13.0.0",
    "env-paths": "^3.0.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` includes the new workspace.

- [ ] **Step 4: Write a failing parser test**

Create `cli/test/cli.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("program exposes the time-locked command name", () => {
  const program = createProgram();
  assert.equal(program.name(), "time-locked");
});
```

- [ ] **Step 5: Run CLI tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail with `Cannot find module .../cli/src/index.js`.

- [ ] **Step 6: Implement minimal command entrypoint**

Create `cli/src/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("time-locked")
    .description("Manage Time Locked decisions from the terminal")
    .option("--api-url <url>", "Override configured API URL")
    .option("--json", "Print machine-readable JSON")
    .option("--no-color", "Disable color");

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
```

- [ ] **Step 7: Verify CLI scaffold**

Run:

```bash
npm test -w cli
npm run build -w cli
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit CLI scaffold**

```bash
git add package.json package-lock.json cli/package.json cli/tsconfig.json cli/src/index.ts cli/test/cli.test.ts
git commit -m "Scaffold Time Locked CLI workspace"
```

---

### Task 3: CLI Duration, Tag, And Format Utilities

**Files:**
- Create: `cli/src/lib/durations.ts`
- Create: `cli/src/lib/tags.ts`
- Create: `cli/src/lib/format.ts`
- Create: `cli/test/durations.test.ts`
- Create: `cli/test/tags.test.ts`
- Create: `cli/test/format.test.ts`

- [ ] **Step 1: Write duration parser tests**

Create `cli/test/durations.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration, parseDuration } from "../src/lib/durations.js";

test("parses supported duration units into seconds", () => {
  assert.equal(parseDuration("1h"), 3600);
  assert.equal(parseDuration("24h"), 86400);
  assert.equal(parseDuration("3d"), 259200);
  assert.equal(parseDuration("1w"), 604800);
});

test("rejects durations shorter than one hour", () => {
  assert.throws(() => parseDuration("30m"), /Minimum timer duration is 1 hour/);
});

test("rejects unsupported duration input", () => {
  assert.throws(() => parseDuration("soon"), /Use a duration like 1h, 24h, 3d, or 1w/);
});

test("formats duration values for terminal output", () => {
  assert.equal(formatDuration(3600), "1h");
  assert.equal(formatDuration(3660), "1h 1m");
  assert.equal(formatDuration(90061), "1d 1h");
});
```

- [ ] **Step 2: Write tag resolver tests**

Create `cli/test/tags.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveTagIds } from "../src/lib/tags.js";

const tags = [
  { id: "tag_career", name: "Career" },
  { id: "tag_work", name: "Work" },
  { id: "custom_1", name: "Work" },
];

test("resolves tag IDs directly", () => {
  assert.deepEqual(resolveTagIds(["tag_career"], tags), ["tag_career"]);
});

test("resolves exact tag names", () => {
  assert.deepEqual(resolveTagIds(["Career"], tags), ["tag_career"]);
});

test("rejects unknown tag names with available tags", () => {
  assert.throws(() => resolveTagIds(["Health"], tags), /Available tags: Career, Work/);
});

test("rejects ambiguous tag names", () => {
  assert.throws(() => resolveTagIds(["Work"], tags), /Tag "Work" is ambiguous/);
});
```

- [ ] **Step 3: Write formatter tests**

Create `cli/test/format.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { formatDecisionList } from "../src/lib/format.js";

test("formats decision list as a stable table", () => {
  const output = formatDecisionList([
    {
      id: "abc123456",
      status: "running",
      title: "Should I accept the new role?",
      timerDuration: 86400,
      timerStartedAt: new Date(Date.now() - 3600_000).toISOString(),
      timerPausedAt: null,
      timeElapsedBeforePause: 0,
      description: null,
      outcome: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  assert.match(output, /ID\\s+Status\\s+Unlocks\\s+Title/);
  assert.match(output, /abc12345\\s+running/);
  assert.match(output, /Should I accept the new role\\?/);
});
```

- [ ] **Step 4: Run utility tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail with missing modules under `cli/src/lib/`.

- [ ] **Step 5: Implement duration utilities**

Create `cli/src/lib/durations.ts`:

```ts
const MINIMUM_SECONDS = 3600;

export function parseDuration(input: string): number {
  const match = input.trim().match(/^(\\d+)([mhdw])$/);
  if (!match) {
    throw new Error("Use a duration like 1h, 24h, 3d, or 1w");
  }

  const value = Number(match[1]);
  const unit = match[2];
  const seconds =
    unit === "m"
      ? value * 60
      : unit === "h"
        ? value * 3600
        : unit === "d"
          ? value * 86400
          : value * 604800;

  if (seconds < MINIMUM_SECONDS) {
    throw new Error("Minimum timer duration is 1 hour");
  }

  return seconds;
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
```

- [ ] **Step 6: Implement tag utilities**

Create `cli/src/lib/tags.ts`:

```ts
export interface CliTag {
  id: string;
  name: string;
}

export function resolveTagIds(inputs: string[], tags: CliTag[]): string[] {
  return inputs.map((input) => resolveTagId(input, tags));
}

function resolveTagId(input: string, tags: CliTag[]): string {
  const direct = tags.find((tag) => tag.id === input);
  if (direct) return direct.id;

  const byName = tags.filter((tag) => tag.name === input);
  if (byName.length === 1) return byName[0].id;

  if (byName.length > 1) {
    throw new Error(`Tag "${input}" is ambiguous. Use the tag ID.`);
  }

  const available = [...new Set(tags.map((tag) => tag.name))].sort().join(", ");
  throw new Error(`Unknown tag "${input}". Available tags: ${available}`);
}
```

- [ ] **Step 7: Implement format utilities**

Create `cli/src/lib/format.ts`:

```ts
import { formatDuration } from "./durations.js";

export type DecisionStatus = "running" | "paused" | "expired" | "stopped";

export interface CliDecision {
  id: string;
  title: string;
  description: string | null;
  timerDuration: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  timeElapsedBeforePause: number;
  status: DecisionStatus;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getTimeRemaining(decision: CliDecision, now = Date.now()): number {
  if (decision.status === "expired" || decision.status === "stopped") return 0;
  if (decision.status === "paused") {
    return Math.max(0, decision.timerDuration - decision.timeElapsedBeforePause);
  }
  if (!decision.timerStartedAt) return decision.timerDuration;
  const elapsed =
    (now - new Date(decision.timerStartedAt).getTime()) / 1000 +
    decision.timeElapsedBeforePause;
  return Math.max(0, decision.timerDuration - elapsed);
}

export function formatDecisionList(decisions: CliDecision[]): string {
  const rows = decisions.map((decision) => ({
    id: decision.id.slice(0, 8),
    status: decision.status,
    unlocks: formatDuration(Math.floor(getTimeRemaining(decision))),
    title: decision.title,
  }));

  const widths = {
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    status: Math.max(6, ...rows.map((row) => row.status.length)),
    unlocks: Math.max(7, ...rows.map((row) => row.unlocks.length)),
  };

  const header = `${"ID".padEnd(widths.id)}  ${"Status".padEnd(widths.status)}  ${"Unlocks".padEnd(widths.unlocks)}  Title`;
  const body = rows.map(
    (row) =>
      `${row.id.padEnd(widths.id)}  ${row.status.padEnd(widths.status)}  ${row.unlocks.padEnd(widths.unlocks)}  ${row.title}`
  );

  return [header, ...body].join("\\n");
}

export function printData(data: unknown, json: boolean, formatter: () => string): string {
  return json ? `${JSON.stringify(data, null, 2)}\\n` : `${formatter()}\\n`;
}
```

- [ ] **Step 8: Verify utilities**

Run:

```bash
npm test -w cli
npm run build -w cli
```

Expected: all CLI tests pass and TypeScript exits 0.

- [ ] **Step 9: Commit utilities**

```bash
git add cli/src/lib/durations.ts cli/src/lib/tags.ts cli/src/lib/format.ts cli/test/durations.test.ts cli/test/tags.test.ts cli/test/format.test.ts
git commit -m "Add CLI formatting and parsing utilities"
```

---

### Task 4: CLI Config And API Client

**Files:**
- Create: `cli/src/lib/config.ts`
- Create: `cli/src/lib/api-client.ts`
- Create: `cli/test/config.test.ts`
- Create: `cli/test/api-client.test.ts`

- [ ] **Step 1: Write config tests**

Create `cli/test/config.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { clearConfig, readConfig, writeConfig } from "../src/lib/config.js";

test("writes, reads, and clears CLI config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "time-locked-cli-"));
  const path = join(dir, "config.json");

  await writeConfig(path, {
    apiUrl: "http://localhost:3001",
    issuerUrl: "https://example.accounts.dev",
    clientId: "oauth_client_123",
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 123,
  });

  assert.deepEqual(await readConfig(path), {
    apiUrl: "http://localhost:3001",
    issuerUrl: "https://example.accounts.dev",
    clientId: "oauth_client_123",
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 123,
  });

  await clearConfig(path);
  assert.equal(await readConfig(path), null);
  await rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Write API client tests**

Create `cli/test/api-client.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient } from "../src/lib/api-client.js";
import type { CliConfig } from "../src/lib/config.js";

test("attaches bearer token and parses JSON", async () => {
  const calls: RequestInit[] = [];
  const client = new ApiClient({
    getConfig: async () => config,
    saveConfig: async () => {},
    fetchImpl: async (_url, init) => {
      calls.push(init ?? {});
      return Response.json({ ok: true });
    },
  });

  assert.deepEqual(await client.get("/api/me"), { ok: true });
  assert.equal((calls[0].headers as Record<string, string>).Authorization, "Bearer access");
});

test("refreshes once on unauthorized response", async () => {
  let count = 0;
  const saved: CliConfig[] = [];
  const client = new ApiClient({
    getConfig: async () => config,
    saveConfig: async (next) => {
      saved.push(next);
    },
    fetchImpl: async (url) => {
      count += 1;
      if (String(url).endsWith("/oauth/token")) {
        return Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 86400,
        });
      }
      if (count === 1) return new Response("Unauthorized", { status: 401 });
      return Response.json({ ok: true });
    },
  });

  assert.deepEqual(await client.get("/api/me"), { ok: true });
  assert.equal(saved[0].accessToken, "new-access");
});

const config: CliConfig = {
  apiUrl: "http://localhost:3001",
  issuerUrl: "https://example.accounts.dev",
  clientId: "oauth_client_123",
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: Date.now() + 60_000,
};
```

- [ ] **Step 3: Run tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail with missing `config.js` and `api-client.js`.

- [ ] **Step 4: Implement config storage**

Create `cli/src/lib/config.ts`:

```ts
import envPaths from "env-paths";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface CliConfig {
  apiUrl: string;
  issuerUrl: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function defaultConfigPath(): string {
  return join(envPaths("time-locked", { suffix: "" }).config, "config.json");
}

export async function readConfig(path = defaultConfigPath()): Promise<CliConfig | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CliConfig;
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

export async function writeConfig(path: string, config: CliConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\\n`, { mode: 0o600 });
}

export async function clearConfig(path = defaultConfigPath()): Promise<void> {
  await rm(path, { force: true });
}
```

- [ ] **Step 5: Implement API client**

Create `cli/src/lib/api-client.ts`:

```ts
import type { CliConfig } from "./config.js";

interface ApiClientOptions {
  getConfig: () => Promise<CliConfig | null>;
  saveConfig: (config: CliConfig) => Promise<void>;
  fetchImpl?: typeof fetch;
}

export class ApiClient {
  private fetchImpl: typeof fetch;

  constructor(private options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(path: string): Promise<unknown> {
    return this.request("GET", path);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    return this.request("POST", path, body);
  }

  async patch(path: string, body?: unknown): Promise<unknown> {
    return this.request("PATCH", path, body);
  }

  private async request(method: string, path: string, body?: unknown, retried = false): Promise<unknown> {
    const config = await this.requireConfig();
    const res = await this.fetchImpl(new URL(path, config.apiUrl), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && !retried) {
      await this.refresh(config);
      return this.request(method, path, body, true);
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(payload.error ?? "Request failed");
    }

    return res.json();
  }

  private async requireConfig(): Promise<CliConfig> {
    const config = await this.options.getConfig();
    if (!config) throw new Error("Run time-locked login first.");
    return config;
  }

  private async refresh(config: CliConfig): Promise<void> {
    const res = await this.fetchImpl(new URL("/oauth/token", config.issuerUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        refresh_token: config.refreshToken,
      }),
    });

    if (!res.ok) throw new Error("Session expired. Run time-locked login again.");
    const payload = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    await this.options.saveConfig({
      ...config,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? config.refreshToken,
      expiresAt: Date.now() + payload.expires_in * 1000,
    });
  }
}
```

- [ ] **Step 6: Verify config and API client**

Run:

```bash
npm test -w cli
npm run build -w cli
```

Expected: all CLI tests pass and TypeScript exits 0.

- [ ] **Step 7: Commit config and API client**

```bash
git add cli/src/lib/config.ts cli/src/lib/api-client.ts cli/test/config.test.ts cli/test/api-client.test.ts
git commit -m "Add CLI config and API client"
```

---

### Task 5: OAuth PKCE Login Library

**Files:**
- Create: `cli/src/lib/auth.ts`
- Create: `cli/test/auth.test.ts`

- [ ] **Step 1: Write PKCE and auth URL tests**

Create `cli/test/auth.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthorizeUrl, createPkcePair } from "../src/lib/auth.js";

test("creates a PKCE verifier and challenge", async () => {
  const pair = await createPkcePair("fixed-verifier");
  assert.equal(pair.verifier, "fixed-verifier");
  assert.match(pair.challenge, /^[A-Za-z0-9_-]+$/);
});

test("builds Clerk authorize URL with PKCE parameters", () => {
  const url = buildAuthorizeUrl({
    authorizationEndpoint: "https://example.accounts.dev/oauth/authorize",
    clientId: "oauth_client_123",
    redirectUri: "http://127.0.0.1:49152/callback",
    codeChallenge: "challenge",
    state: "state123",
    scopes: ["openid", "profile", "email", "offline_access"],
  });

  assert.equal(url.origin, "https://example.accounts.dev");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "oauth_client_123");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state123");
});
```

- [ ] **Step 2: Run auth tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail with missing `cli/src/lib/auth.js`.

- [ ] **Step 3: Implement PKCE and auth URL helpers**

Create `cli/src/lib/auth.ts` with the helper functions first:

```ts
import { createHash, randomBytes } from "node:crypto";

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export async function createPkcePair(verifier = randomToken(64)): Promise<PkcePair> {
  const hash = createHash("sha256").update(verifier).digest();
  return {
    verifier,
    challenge: base64Url(hash),
  };
}

export function buildAuthorizeUrl(input: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
}): URL {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.scopes.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export function randomToken(bytes = 32): string {
  return base64Url(randomBytes(bytes));
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\\+/g, "-")
    .replace(/\\//g, "_")
    .replace(/=+$/g, "");
}
```

- [ ] **Step 4: Verify helper tests**

Run:

```bash
npm test -w cli
```

Expected: auth helper tests pass.

- [ ] **Step 5: Add login orchestration interfaces**

Extend `cli/src/lib/auth.ts` with these interfaces and exported function signatures:

```ts
export interface CliAuthConfigResponse {
  issuerUrl: string;
  clientId: string;
  redirectUriPattern: "http://127.0.0.1:{port}/callback";
  scopes: string[];
}

export interface OAuthMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
```

Then add `fetchAuthConfig`, `fetchOAuthMetadata`, and `exchangeCodeForTokens` functions that accept an injected `fetchImpl = fetch`. Each function must throw a plain `Error` when the HTTP response is not OK.

- [ ] **Step 6: Add integration-level tests for metadata and token exchange**

Append tests to `cli/test/auth.test.ts`:

```ts
import {
  exchangeCodeForTokens,
  fetchAuthConfig,
  fetchOAuthMetadata,
} from "../src/lib/auth.js";

test("fetches backend CLI auth config", async () => {
  const config = await fetchAuthConfig("http://localhost:3001", async () =>
    Response.json({
      issuerUrl: "https://example.accounts.dev",
      clientId: "oauth_client_123",
      redirectUriPattern: "http://127.0.0.1:{port}/callback",
      scopes: ["openid", "profile", "email", "offline_access"],
    })
  );

  assert.equal(config.clientId, "oauth_client_123");
});

test("fetches OAuth metadata from issuer URL", async () => {
  const metadata = await fetchOAuthMetadata("https://example.accounts.dev", async () =>
    Response.json({
      authorization_endpoint: "https://example.accounts.dev/oauth/authorize",
      token_endpoint: "https://example.accounts.dev/oauth/token",
    })
  );

  assert.equal(metadata.token_endpoint, "https://example.accounts.dev/oauth/token");
});

test("exchanges authorization code for tokens", async () => {
  const token = await exchangeCodeForTokens(
    {
      tokenEndpoint: "https://example.accounts.dev/oauth/token",
      clientId: "oauth_client_123",
      code: "code123",
      codeVerifier: "verifier",
      redirectUri: "http://127.0.0.1:49152/callback",
    },
    async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 86400,
      })
  );

  assert.equal(token.access_token, "access");
});
```

- [ ] **Step 7: Implement metadata and token functions**

Implement these functions in `cli/src/lib/auth.ts`:

```ts
export async function fetchAuthConfig(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<CliAuthConfigResponse> {
  const res = await fetchImpl(new URL("/api/auth/config", apiUrl));
  if (!res.ok) throw new Error("CLI auth is not configured on this server");
  return (await res.json()) as CliAuthConfigResponse;
}

export async function fetchOAuthMetadata(
  issuerUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<OAuthMetadata> {
  const res = await fetchImpl(new URL("/.well-known/openid-configuration", issuerUrl));
  if (!res.ok) throw new Error("Unable to discover OAuth metadata");
  return (await res.json()) as OAuthMetadata;
}

export async function exchangeCodeForTokens(
  input: {
    tokenEndpoint: string;
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  },
  fetchImpl: typeof fetch = fetch
): Promise<TokenResponse> {
  const res = await fetchImpl(input.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.clientId,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    }),
  });

  if (!res.ok) throw new Error("Unable to exchange authorization code");
  return (await res.json()) as TokenResponse;
}
```

- [ ] **Step 8: Verify auth library**

Run:

```bash
npm test -w cli
npm run build -w cli
```

Expected: all CLI tests pass and TypeScript exits 0.

- [ ] **Step 9: Commit auth library**

```bash
git add cli/src/lib/auth.ts cli/test/auth.test.ts
git commit -m "Add CLI OAuth PKCE helpers"
```

---

### Task 6: Auth Commands

**Files:**
- Create: `cli/src/commands/auth.ts`
- Modify: `cli/src/index.ts`
- Create: `cli/test/auth-commands.test.ts`

- [ ] **Step 1: Write auth command tests for logout and whoami**

Create `cli/test/auth-commands.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("logout clears config and prints confirmation", async () => {
  let cleared = false;
  const output: string[] = [];
  const program = createProgram({
    clearConfig: async () => {
      cleared = true;
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "logout"]);
  assert.equal(cleared, true);
  assert.equal(output.join(""), "Logged out.\\n");
});

test("whoami prints current user id", async () => {
  const output: string[] = [];
  const program = createProgram({
    apiClient: {
      get: async () => ({ userId: "user_123", sessionId: "sess_123" }),
      post: async () => ({}),
      patch: async () => ({}),
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "whoami"]);
  assert.match(output.join(""), /user_123/);
});
```

- [ ] **Step 2: Run auth command tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail because `logout` and `whoami` commands are not registered.

- [ ] **Step 3: Add command dependency injection types**

Modify `cli/src/index.ts` so `createProgram` accepts dependencies:

```ts
export interface CliDependencies {
  apiClient?: {
    get(path: string): Promise<unknown>;
    post(path: string, body: unknown): Promise<unknown>;
    patch(path: string, body?: unknown): Promise<unknown>;
  };
  clearConfig?: () => Promise<void>;
  writeOutput?: (text: string) => void;
}

const defaultDependencies: CliDependencies = {
  writeOutput: (text) => process.stdout.write(text),
};

export function createProgram(deps: CliDependencies = {}): Command {
  const dependencies = { ...defaultDependencies, ...deps };
  const program = new Command();
  program
    .name("time-locked")
    .description("Manage Time Locked decisions from the terminal")
    .option("--api-url <url>", "Override configured API URL")
    .option("--json", "Print machine-readable JSON")
    .option("--no-color", "Disable color");
  registerAuthCommands(program, dependencies);
  return program;
}
```

- [ ] **Step 4: Implement auth commands**

Create `cli/src/commands/auth.ts`:

```ts
import type { Command } from "commander";
import { clearConfig } from "../lib/config.js";
import type { CliDependencies } from "../index.js";

export function registerAuthCommands(program: Command, deps: CliDependencies): void {
  program.command("logout").action(async () => {
    await (deps.clearConfig ?? clearConfig)();
    deps.writeOutput?.("Logged out.\\n");
  });

  program.command("whoami").action(async () => {
    if (!deps.apiClient) throw new Error("Run time-locked login first.");
    const me = (await deps.apiClient.get("/api/me")) as {
      userId: string;
      sessionId: string | null;
    };
    deps.writeOutput?.(`User: ${me.userId}\\n`);
    if (me.sessionId) deps.writeOutput?.(`Session: ${me.sessionId}\\n`);
  });

  program.command("login").option("--api-url <url>", "API URL").action(async () => {
    throw new Error("Browser login is wired in the next task.");
  });
}
```

Import and call `registerAuthCommands` from `cli/src/index.ts`.

- [ ] **Step 5: Verify auth command tests**

Run:

```bash
npm test -w cli
npm run build -w cli
```

Expected: tests pass and TypeScript exits 0.

- [ ] **Step 6: Wire real login command**

Extend `cli/src/lib/auth.ts` with `runBrowserLogin` after the command tests are green. It should:

1. Fetch backend auth config.
2. Fetch OAuth metadata.
3. Allocate a localhost port with `server.listen(0, "127.0.0.1")`.
4. Build redirect URI by replacing `{port}`.
5. Build authorization URL.
6. Open browser.
7. Resolve when callback receives matching `state` and `code`.
8. Exchange code for tokens.
9. Return a `CliConfig`.

Then modify `cli/src/commands/auth.ts` `login` action to call `runBrowserLogin`, write config, and print:

```text
Logged in to <api-url>
```

Keep callback server creation isolated in `lib/auth.ts` so command tests do not open browsers.

- [ ] **Step 7: Manually test login with missing backend config**

Run:

```bash
npm run dev -w cli -- login --api-url http://localhost:3001
```

Expected when backend env is missing: `CLI auth is not configured on this server`.

- [ ] **Step 8: Commit auth commands**

```bash
git add cli/src/index.ts cli/src/commands/auth.ts cli/src/lib/auth.ts cli/test/auth-commands.test.ts
git commit -m "Add CLI auth commands"
```

---

### Task 7: Decision Commands

**Files:**
- Create: `cli/src/commands/decisions.ts`
- Modify: `cli/src/index.ts`
- Create: `cli/test/decision-commands.test.ts`

- [ ] **Step 1: Write decision command tests**

Create `cli/test/decision-commands.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("decisions list --active fetches running and paused decisions", async () => {
  const paths: string[] = [];
  const output: string[] = [];
  const program = createProgram({
    apiClient: {
      get: async (path: string) => {
        paths.push(path);
        return [];
      },
      post: async () => ({}),
      patch: async () => ({}),
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "decisions", "list", "--active"]);
  assert.deepEqual(paths, ["/api/decisions?status=running", "/api/decisions?status=paused"]);
});

test("decisions create with flags posts expected payload", async () => {
  let posted: unknown;
  const program = createProgram({
    apiClient: {
      get: async () => [{ id: "tag_career", name: "Career" }],
      post: async (_path: string, body: unknown) => {
        posted = body;
        return { id: "abc123", title: "Role?", status: "running", timerDuration: 86400 };
      },
      patch: async () => ({}),
    },
    writeOutput: () => {},
  });

  await program.parseAsync([
    "node",
    "time-locked",
    "decisions",
    "create",
    "--title",
    "Role?",
    "--duration",
    "24h",
    "--tag",
    "Career",
    "--yes",
  ]);

  assert.deepEqual(posted, {
    title: "Role?",
    description: null,
    timerDuration: 86400,
    tagIds: ["tag_career"],
  });
});
```

- [ ] **Step 2: Run decision command tests to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail because `decisions` command is not registered.

- [ ] **Step 3: Implement decisions command registration**

Create `cli/src/commands/decisions.ts` with:

```ts
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { Command } from "commander";
import type { CliDependencies } from "../index.js";
import { parseDuration } from "../lib/durations.js";
import { formatDecisionList, printData } from "../lib/format.js";
import { resolveTagIds, type CliTag } from "../lib/tags.js";

const PRESETS = [
  { name: "1 hour", value: "1h" },
  { name: "6 hours", value: "6h" },
  { name: "24 hours", value: "24h" },
  { name: "3 days", value: "3d" },
  { name: "1 week", value: "1w" },
];

export function registerDecisionCommands(program: Command, deps: CliDependencies): void {
  const decisions = program.command("decisions");

  decisions
    .command("list")
    .option("--active", "List running and paused decisions")
    .option("--history", "List expired and stopped decisions")
    .option("--status <status>", "Filter by status")
    .action(async (options) => {
      const api = requireApi(deps);
      const rows = options.active
        ? [
            ...((await api.get("/api/decisions?status=running")) as unknown[]),
            ...((await api.get("/api/decisions?status=paused")) as unknown[]),
          ]
        : options.history
          ? [
              ...((await api.get("/api/decisions?status=expired")) as unknown[]),
              ...((await api.get("/api/decisions?status=stopped")) as unknown[]),
            ]
          : ((await api.get(options.status ? `/api/decisions?status=${options.status}` : "/api/decisions")) as unknown[]);

      deps.writeOutput?.(printData(rows, program.opts().json, () => formatDecisionList(rows as any)));
    });

  decisions
    .command("create")
    .option("--title <title>")
    .option("--description <description>")
    .option("--duration <duration>")
    .option("--tag <tag>", "Tag name or ID", collect, [])
    .option("--yes", "Skip confirmation")
    .action(async (options) => {
      const api = requireApi(deps);
      const tags = (await api.get("/api/tags")) as CliTag[];
      const title = String(options.title ?? (await input({ message: "Title:" }))).trim();
      if (!title) throw new Error("Title is required");

      const descriptionValue =
        options.description ?? (await input({ message: "Context:", default: "" }));
      const durationValue =
        options.duration ??
        (await select({
          message: "Duration:",
          choices: PRESETS,
        }));
      const selectedTagInputs =
        options.tag.length > 0
          ? options.tag
          : await checkbox({
              message: "Tags:",
              choices: tags.map((tag) => ({ name: tag.name, value: tag.id })),
            });

      if (!options.yes) {
        const ok = await confirm({ message: "Create and start timer now?", default: true });
        if (!ok) return;
      }

      const payload = {
        title,
        description: String(descriptionValue).trim() || null,
        timerDuration: parseDuration(durationValue),
        tagIds: resolveTagIds(selectedTagInputs, tags),
      };
      const created = (await api.post("/api/decisions", payload)) as any;
      deps.writeOutput?.(`Created decision ${created.id}\\n${created.title}\\nStatus: ${created.status}\\n`);
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function requireApi(deps: CliDependencies): NonNullable<CliDependencies["apiClient"]> {
  if (!deps.apiClient) throw new Error("Run time-locked login first.");
  return deps.apiClient;
}
```

Import and call `registerDecisionCommands(program, dependencies)` from `cli/src/index.ts`.

- [ ] **Step 4: Verify create/list tests**

Run:

```bash
npm test -w cli
npm run build -w cli
```

Expected: tests pass and TypeScript exits 0.

- [ ] **Step 5: Add show/pause/resume/stop/outcome commands**

Extend `cli/src/commands/decisions.ts`:

```ts
decisions.command("show").argument("<id>").action(async (id) => {
  const api = requireApi(deps);
  const decision = await api.get(`/api/decisions/${id}`);
  deps.writeOutput?.(printData(decision, program.opts().json, () => JSON.stringify(decision, null, 2)));
});

decisions.command("pause").argument("<id>").action(async (id) => {
  await requireApi(deps).patch(`/api/decisions/${id}/pause`);
  deps.writeOutput?.("Paused decision.\\n");
});

decisions.command("resume").argument("<id>").action(async (id) => {
  await requireApi(deps).patch(`/api/decisions/${id}/resume`);
  deps.writeOutput?.("Resumed decision.\\n");
});

decisions.command("stop").argument("<id>").option("--yes").action(async (id, options) => {
  if (!options.yes) {
    const ok = await confirm({ message: "Stop this decision?", default: false });
    if (!ok) return;
  }
  await requireApi(deps).patch(`/api/decisions/${id}/stop`);
  deps.writeOutput?.("Stopped decision.\\n");
});

decisions.command("outcome").argument("<id>").requiredOption("--text <text>").action(async (id, options) => {
  await requireApi(deps).patch(`/api/decisions/${id}/outcome`, { outcome: options.text });
  deps.writeOutput?.("Saved outcome.\\n");
});
```

Add command tests for each path by injecting an `apiClient.patch` method and asserting the path/body.

- [ ] **Step 6: Commit decision commands**

```bash
git add cli/src/index.ts cli/src/commands/decisions.ts cli/test/decision-commands.test.ts
git commit -m "Add CLI decision commands"
```

---

### Task 8: Notes Command And Real API Client Wiring

**Files:**
- Create: `cli/src/commands/notes.ts`
- Modify: `cli/src/index.ts`
- Create: `cli/test/notes-command.test.ts`

- [ ] **Step 1: Write notes command test**

Create `cli/test/notes-command.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("notes add posts note content", async () => {
  let path = "";
  let body: unknown;
  const program = createProgram({
    apiClient: {
      get: async () => ({}),
      post: async (nextPath: string, nextBody: unknown) => {
        path = nextPath;
        body = nextBody;
        return { id: "note_1" };
      },
      patch: async () => ({}),
    },
    writeOutput: () => {},
  });

  await program.parseAsync([
    "node",
    "time-locked",
    "notes",
    "add",
    "decision_1",
    "--text",
    "New concern surfaced",
  ]);

  assert.equal(path, "/api/decisions/decision_1/notes");
  assert.deepEqual(body, { content: "New concern surfaced" });
});
```

- [ ] **Step 2: Run notes test to verify red**

Run:

```bash
npm test -w cli
```

Expected: fail because `notes` command is not registered.

- [ ] **Step 3: Implement notes command**

Create `cli/src/commands/notes.ts`:

```ts
import { input } from "@inquirer/prompts";
import type { Command } from "commander";
import type { CliDependencies } from "../index.js";

export function registerNotesCommands(program: Command, deps: CliDependencies): void {
  const notes = program.command("notes");

  notes
    .command("add")
    .argument("<decisionId>")
    .option("--text <text>")
    .action(async (decisionId, options) => {
      if (!deps.apiClient) throw new Error("Run time-locked login first.");
      const content = String(options.text ?? (await input({ message: "Note:" }))).trim();
      if (!content) throw new Error("Note content is required");
      await deps.apiClient.post(`/api/decisions/${decisionId}/notes`, { content });
      deps.writeOutput?.("Added note.\\n");
    });
}
```

Import and register it from `cli/src/index.ts`.

- [ ] **Step 4: Wire default runtime dependencies**

Modify `cli/src/index.ts` so default runtime dependencies create a real `ApiClient` using:

- `readConfig`
- `writeConfig(defaultConfigPath(), config)`
- process stdout

Keep tests injectable by allowing passed dependencies to override defaults.

- [ ] **Step 5: Verify notes and runtime wiring**

Run:

```bash
npm test -w cli
npm run build -w cli
npm run build
```

Expected: tests pass and root build exits 0.

- [ ] **Step 6: Commit notes and wiring**

```bash
git add cli/src/index.ts cli/src/commands/notes.ts cli/test/notes-command.test.ts
git commit -m "Add CLI notes command"
```

---

### Task 9: Documentation And Smoke Checklist

**Files:**
- Modify: `README.md`
- Create: `cli/README.md`

- [ ] **Step 1: Add root README CLI section**

Append this section to `README.md` before Roadmap:

````md
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
````

- [ ] **Step 2: Add CLI README**

Create `cli/README.md`:

````md
# Time Locked CLI

Terminal companion for Time Locked.

## Development

```bash
npm install
npm test -w cli
npm run build -w cli
npm run dev -w cli -- --help
```

## Commands

```bash
time-locked login --api-url http://localhost:3001
time-locked logout
time-locked whoami
time-locked decisions list --active
time-locked decisions create
time-locked decisions show <id>
time-locked decisions pause <id>
time-locked decisions resume <id>
time-locked decisions stop <id>
time-locked decisions outcome <id> --text "Decision text"
time-locked notes add <decision-id> --text "New thought"
```

The CLI is an API client. It never accesses the database directly.
````

- [ ] **Step 3: Run final automated verification**

Run:

```bash
npm test -w backend
npm test -w cli
npm run build
```

Expected: all tests pass and root build exits 0.

- [ ] **Step 4: Run manual smoke where credentials are available**

With backend running and Clerk OAuth env configured:

```bash
npm run dev
npm run dev -w cli -- login --api-url http://localhost:3001
npm run dev -w cli -- whoami
npm run dev -w cli -- decisions create
npm run dev -w cli -- decisions list --active
```

Expected:

- Browser opens during login.
- `whoami` prints the Clerk user ID.
- `decisions create` creates a running decision.
- `decisions list --active` shows that decision.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md cli/README.md
git commit -m "Document CLI usage"
```

---

## Final Verification

After all tasks are implemented:

```bash
git status --short --branch
npm test -w backend
npm test -w cli
npm run build
```

Required final state:

- Worktree clean.
- Backend tests pass.
- CLI tests pass.
- Root build passes.
- CLI implementation commits are separate and ordered by task.

## Spec Coverage Checklist

- First-party Node CLI workspace: Task 2.
- Backend `GET /api/auth/config`: Task 1.
- Backend `GET /api/me`: Task 1.
- Browser-based OAuth + PKCE: Tasks 5 and 6.
- Local token/config storage: Task 4.
- API client with refresh retry: Task 4.
- Hybrid interactive `decisions create`: Task 7.
- List/show/pause/resume/stop/outcome commands: Task 7.
- Notes add command: Task 8.
- Human output and JSON path: Tasks 3 and 7.
- Duration parsing and tag resolution: Task 3.
- Tests and smoke checklist: Tasks 1 through 9.
- Non-goals preserved: no direct SQLite access, no push notifications, no device-code login.
