import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { Command } from "commander";
import type { CliDependencies } from "../index.js";
import { parseDuration } from "../lib/durations.js";
import { formatDecisionList, printData, type CliDecision } from "../lib/format.js";
import { resolveTagIds, type CliTag } from "../lib/tags.js";

const PRESETS = [
  { name: "1 hour", value: "1h" },
  { name: "6 hours", value: "6h" },
  { name: "24 hours", value: "24h" },
  { name: "3 days", value: "3d" },
  { name: "1 week", value: "1w" },
];

export function registerDecisionCommands(program: Command, deps: CliDependencies): void {
  const decisions = program.command("decisions");

  decisions
    .command("list")
    .option("--active", "List running and paused decisions")
    .option("--history", "List expired and stopped decisions")
    .option("--status <status>", "Filter by status")
    .action(async (options) => {
      const api = requireApi(deps);
      const rows = options.active
        ? [
            ...((await api.get("/api/decisions?status=running")) as unknown[]),
            ...((await api.get("/api/decisions?status=paused")) as unknown[]),
          ]
        : options.history
          ? [
              ...((await api.get("/api/decisions?status=expired")) as unknown[]),
              ...((await api.get("/api/decisions?status=stopped")) as unknown[]),
            ]
          : ((await api.get(
              options.status ? `/api/decisions?status=${options.status}` : "/api/decisions"
            )) as unknown[]);

      deps.writeOutput?.(
        printData(rows, program.opts().json, () => formatDecisionList(rows as CliDecision[]))
      );
    });

  decisions
    .command("create")
    .option("--title <title>")
    .option("--description <description>")
    .option("--duration <duration>")
    .option("--tag <tag>", "Tag name or ID", collect, [])
    .option("--yes", "Skip confirmation")
    .action(async (options) => {
      const api = requireApi(deps);
      const tags = (await api.get("/api/tags")) as CliTag[];
      const title = String(options.title ?? (await input({ message: "Title:" }))).trim();
      if (!title) throw new Error("Title is required");

      const descriptionValue =
        options.description ??
        (options.yes ? "" : await input({ message: "Context:", default: "" }));
      const durationValue =
        options.duration ??
        (await select({
          message: "Duration:",
          choices: PRESETS,
        }));
      const selectedTagInputs =
        options.tag.length > 0
          ? options.tag
          : options.yes
            ? []
          : await checkbox({
              message: "Tags:",
              choices: tags.map((tag) => ({ name: tag.name, value: tag.id })),
            });

      if (!options.yes) {
        const ok = await confirm({ message: "Create and start timer now?", default: true });
        if (!ok) return;
      }

      const payload = {
        title,
        description: String(descriptionValue).trim() || null,
        timerDuration: parseDuration(durationValue),
        tagIds: resolveTagIds(selectedTagInputs, tags),
      };
      const created = (await api.post("/api/decisions", payload)) as any;
      deps.writeOutput?.(
        `Created decision ${created.id}\n${created.title}\nStatus: ${created.status}\n`
      );
    });

  decisions.command("show").argument("<id>").action(async (id) => {
    const api = requireApi(deps);
    const decision = await api.get(`/api/decisions/${id}`);
    deps.writeOutput?.(
      printData(decision, program.opts().json, () => JSON.stringify(decision, null, 2))
    );
  });

  decisions.command("pause").argument("<id>").action(async (id) => {
    await requireApi(deps).patch(`/api/decisions/${id}/pause`);
    deps.writeOutput?.("Paused decision.\n");
  });

  decisions.command("resume").argument("<id>").action(async (id) => {
    await requireApi(deps).patch(`/api/decisions/${id}/resume`);
    deps.writeOutput?.("Resumed decision.\n");
  });

  decisions.command("stop").argument("<id>").option("--yes").action(async (id, options) => {
    if (!options.yes) {
      const ok = await confirm({ message: "Stop this decision?", default: false });
      if (!ok) return;
    }
    await requireApi(deps).patch(`/api/decisions/${id}/stop`);
    deps.writeOutput?.("Stopped decision.\n");
  });

  decisions
    .command("outcome")
    .argument("<id>")
    .requiredOption("--text <text>")
    .action(async (id, options) => {
      await requireApi(deps).patch(`/api/decisions/${id}/outcome`, {
        outcome: options.text,
      });
      deps.writeOutput?.("Saved outcome.\n");
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function requireApi(deps: CliDependencies): NonNullable<CliDependencies["apiClient"]> {
  if (!deps.apiClient) throw new Error("Run time-locked login first.");
  return deps.apiClient;
}
