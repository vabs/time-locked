import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeCodeForTokens,
  fetchAuthConfig,
  fetchOAuthMetadata,
} from "../src/lib/auth.js";

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
