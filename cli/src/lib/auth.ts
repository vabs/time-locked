import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import open from "open";
import type { CliConfig } from "./config.js";

export interface PkcePair {
  verifier: string;
  challenge: string;
}

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

export async function runBrowserLogin(input: {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  openUrl?: (url: string) => Promise<unknown>;
}): Promise<CliConfig> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const authConfig = await fetchAuthConfig(input.apiUrl, fetchImpl);
  const metadata = await fetchOAuthMetadata(authConfig.issuerUrl, fetchImpl);
  const pkce = await createPkcePair();
  const state = randomToken();
  const callback = await waitForCallback();
  const redirectUri = authConfig.redirectUriPattern.replace(
    "{port}",
    String(callback.port)
  );

  const authorizeUrl = buildAuthorizeUrl({
    authorizationEndpoint: metadata.authorization_endpoint,
    clientId: authConfig.clientId,
    redirectUri,
    codeChallenge: pkce.challenge,
    state,
    scopes: authConfig.scopes,
  });

  let code: string;
  try {
    await (input.openUrl ?? open)(authorizeUrl.toString());
    code = await callback.waitForCode(state);
  } catch (err) {
    callback.close();
    throw err;
  }

  const token = await exchangeCodeForTokens(
    {
      tokenEndpoint: metadata.token_endpoint,
      clientId: authConfig.clientId,
      code,
      codeVerifier: pkce.verifier,
      redirectUri,
    },
    fetchImpl
  );

  return {
    apiUrl: input.apiUrl,
    issuerUrl: authConfig.issuerUrl,
    clientId: authConfig.clientId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
}

async function waitForCallback(): Promise<{
  port: number;
  waitForCode: (expectedState: string) => Promise<string>;
  close: () => void;
}> {
  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  let closed = false;
  const close = () => {
    if (!closed) {
      closed = true;
      server.close();
    }
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400).end("Time Locked login failed. You can close this tab.");
      rejectCode(new Error(error));
      close();
      return;
    }

    if (!code || !state) {
      res.writeHead(400).end("Missing login callback parameters.");
      return;
    }

    res.writeHead(200).end("Time Locked login complete. You can close this tab.");
    resolveCode(`${state}:${code}`);
    close();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to start login callback server");
  }

  return {
    port: address.port,
    close,
    waitForCode: async (expectedState) => {
      const value = await codePromise;
      const separator = value.indexOf(":");
      const state = value.slice(0, separator);
      const code = value.slice(separator + 1);
      if (state !== expectedState) {
        throw new Error("Login state did not match");
      }
      return code;
    },
  };
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
