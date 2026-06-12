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
