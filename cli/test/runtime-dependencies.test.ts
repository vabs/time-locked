import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDefaultDependencies, createProgram } from "../src/index.js";
import { writeConfig } from "../src/lib/config.js";

test("default runtime dependencies read config and send authenticated requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "time-locked-cli-"));
  const configPath = join(dir, "config.json");
  const calls: Array<{ url: string; authorization: string | null }> = [];

  try {
    await writeConfig(configPath, {
      apiUrl: "https://api.example.test",
      issuerUrl: "https://issuer.example.test",
      clientId: "client_123",
      accessToken: "access_123",
      refreshToken: "refresh_123",
      expiresAt: Date.now() + 60_000,
    });

    const output: string[] = [];
    const program = createProgram({
      ...createDefaultDependencies({
        configPath,
        fetchImpl: async (input, init) => {
          const url = input instanceof URL ? input.toString() : String(input);
          const headers = new Headers(init?.headers);
          calls.push({ url, authorization: headers.get("authorization") });
          return Response.json({ userId: "user_123", sessionId: null });
        },
      }),
      writeOutput: (text) => output.push(text),
    });

    await program.parseAsync(["node", "time-locked", "whoami"]);

    assert.deepEqual(calls, [
      {
        url: "https://api.example.test/api/me",
        authorization: "Bearer access_123",
      },
    ]);
    assert.deepEqual(output, ["User: user_123\n"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
