#!/usr/bin/env node
import { Command } from "commander";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("time-locked")
    .description("Manage Time Locked decisions from the terminal")
    .option("--api-url <url>", "Override configured API URL")
    .option("--json", "Print machine-readable JSON")
    .option("--no-color", "Disable color");

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
