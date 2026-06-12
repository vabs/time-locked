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
