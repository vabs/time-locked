import { input } from "@inquirer/prompts";
import type { Command } from "commander";
import type { CliDependencies } from "../index.js";

export function registerNotesCommands(program: Command, deps: CliDependencies): void {
  const notes = program.command("notes");

  notes
    .command("add")
    .argument("<decisionId>")
    .option("--text <text>")
    .action(async (decisionId, options) => {
      if (!deps.apiClient) throw new Error("Run time-locked login first.");
      const content = String(options.text ?? (await input({ message: "Note:" }))).trim();
      if (!content) throw new Error("Note content is required");
      await deps.apiClient.post(`/api/decisions/${decisionId}/notes`, { content });
      deps.writeOutput?.("Added note.\n");
    });
}
