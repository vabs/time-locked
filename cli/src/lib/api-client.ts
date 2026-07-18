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

  private async request(
    method: string,
    path: string,
    body?: unknown,
    retried = false
  ): Promise<unknown> {
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
