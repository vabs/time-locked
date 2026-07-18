import type { Command } from "commander";
import type { CliDependencies } from "../index.js";
import { clearConfig, defaultConfigPath, writeConfig, type CliConfig } from "../lib/config.js";
import { runBrowserLogin } from "../lib/auth.js";

export function registerAuthCommands(program: Command, deps: CliDependencies): void {
  program
    .command("login")
    .option("--api-url <url>", "API URL")
    .action(async (options) => {
      const apiUrl = (options.apiUrl ?? program.opts().apiUrl) as string | undefined;
      if (!apiUrl) throw new Error("Pass --api-url or configure an API URL.");
      const config = await (deps.runBrowserLogin ?? runBrowserLogin)({ apiUrl });
      await (deps.saveLoginConfig ?? ((next) => writeConfig(defaultConfigPath(), next)))(
        config
      );
      deps.writeOutput?.(`Logged in to ${config.apiUrl}\n`);
    });

  program.command("logout").action(async () => {
    await (deps.clearConfig ?? clearConfig)();
    deps.writeOutput?.("Logged out.\n");
  });

  program.command("whoami").action(async () => {
    if (!deps.apiClient) throw new Error("Run time-locked login first.");
    const me = (await deps.apiClient.get("/api/me")) as {
      userId: string;
      sessionId: string | null;
    };
    deps.writeOutput?.(`User: ${me.userId}\n`);
    if (me.sessionId) deps.writeOutput?.(`Session: ${me.sessionId}\n`);
  });
}
