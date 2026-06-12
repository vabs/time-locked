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
