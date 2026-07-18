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
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export async function clearConfig(path = defaultConfigPath()): Promise<void> {
  await rm(path, { force: true });
}
