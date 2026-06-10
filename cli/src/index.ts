#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import type { CliConfig } from "./lib/config.js";

export interface CliDependencies {
  apiClient?: {
    get(path: string): Promise<unknown>;
    post(path: string, body: unknown): Promise<unknown>;
    patch(path: string, body?: unknown): Promise<unknown>;
  };
  clearConfig?: () => Promise<void>;
  runBrowserLogin?: (input: { apiUrl: string }) => Promise<CliConfig>;
  saveLoginConfig?: (config: CliConfig) => Promise<void>;
  writeOutput?: (text: string) => void;
}

const defaultDependencies: CliDependencies = {
  writeOutput: (text) => process.stdout.write(text),
};

export function createProgram(deps: CliDependencies = {}): Command {
  const dependencies = { ...defaultDependencies, ...deps };
  const program = new Command();

  program
    .name("time-locked")
    .description("Manage Time Locked decisions from the terminal")
    .option("--api-url <url>", "Override configured API URL")
    .option("--json", "Print machine-readable JSON")
    .option("--no-color", "Disable color");

  registerAuthCommands(program, dependencies);

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await createProgram().parseAsync(process.argv);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
