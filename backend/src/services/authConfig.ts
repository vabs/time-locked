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
