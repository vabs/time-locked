import { createHash, randomBytes } from "node:crypto";

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

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
