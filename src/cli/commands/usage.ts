import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";
import type { LocalUsageCommandArgs } from "../../lib/types/index.js";

/**
 * `neurolink usage local` — token spend read from each CLI's own session logs.
 *
 * The proxy's ledger only sees traffic that went through it, which is a
 * fraction of what a developer actually spends: it depends on each vendor
 * shipping a base-URL override, and most do not. Every CLI writes a local
 * transcript regardless, so this reads those instead — no auth, no vendor
 * cooperation, no proxy in the request path, and it recovers history from
 * before the proxy was ever installed.
 */
export class UsageCommandFactory {
  static createUsageCommands(): CommandModule<object, LocalUsageCommandArgs> {
    return {
      command: "usage <subcommand>",
      describe: "Token usage read from local CLI session logs",
      builder: (yargs: Argv) =>
        yargs.command({
          command: "local",
          describe:
            "Summarise token spend from each installed CLI's own session logs",
          builder: (sub: Argv) =>
            sub
              .option("since", {
                type: "number",
                default: 30,
                description:
                  "Only read sessions modified within this many days (0 = all history)",
              })
              .option("cli", {
                type: "string",
                description:
                  "Limit to one CLI id (e.g. claude-code, codex, opencode)",
              })
              .option("json", {
                type: "boolean",
                default: false,
                description: "Emit the raw report as JSON",
              }),
          handler: async (argv) => {
            // Single assertion, not a double. yargs types the sub-builder's
            // argv structurally; the fields below are the ones the builder
            // declares, so this stays overlap-checked by the compiler.
            await UsageCommandFactory.executeLocal({
              since: Number(argv.since ?? 30),
              json: Boolean(argv.json),
              ...(typeof argv.cli === "string" ? { cli: argv.cli } : {}),
            });
          },
        }) as Argv<LocalUsageCommandArgs>,
      handler: () => {
        // yargs prints subcommand help when none is given.
      },
    };
  }

  private static formatTokens(value: number): string {
    // Plain grouped digits rather than 1.2M: these are billing-adjacent
    // figures and a reader comparing two rows needs the magnitudes to line up,
    // not to be rounded into looking similar.
    return value.toLocaleString("en-US");
  }

  private static async executeLocal(
    argv: LocalUsageCommandArgs,
  ): Promise<void> {
    const { readAllLocalUsage, getLocalUsageDescriptors } =
      await import("../../lib/localUsage/index.js");

    // `--since 0` means all history — Infinity is the reader's sentinel for
    // "no time filter", but 0 is what a person types. A NEGATIVE value is a
    // mistake and must be rejected rather than folded in with 0: the previous
    // expression sent -1 down the all-history path, so a typo produced the
    // most expensive possible scan while the option's own help text says 0 is
    // the way to ask for that.
    if (!Number.isFinite(argv.since) || argv.since < 0) {
      console.error(
        chalk.red(
          `--since must be zero or greater (0 means all history). Received: ${String(argv.since)}`,
        ),
      );
      process.exitCode = 1;
      return;
    }
    const sinceDays = argv.since > 0 ? argv.since : Infinity;

    // Validate BEFORE scanning. A typo should cost nothing, not a full sweep
    // of every store followed by an empty result.
    // `undefined` means the flag was not given. An empty string means it was
    // given with no value, which is a mistake and must be rejected — a
    // truthiness check treats the two as the same and silently scans every
    // reader instead, reporting everything for a request that named nothing.
    // "copilot-cli" is the pre-rename spelling and is still in the published
    // LocalUsageCliId union, so it must keep resolving. Normalised here rather
    // than registered twice: two descriptors for one reader would show the CLI
    // twice in every report.
    const wanted = argv.cli === "copilot-cli" ? "copilot" : argv.cli;
    const known = getLocalUsageDescriptors().map((d) => d.id);
    if (
      wanted !== undefined &&
      !known.includes(wanted as (typeof known)[number])
    ) {
      console.error(
        chalk.red(
          `Unknown CLI "${wanted}". Known readers: ${known.join(", ")}`,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const report = await readAllLocalUsage({
      sinceDays,
      // Passed down so only the requested reader opens its store at all.
      ...(wanted !== undefined
        ? { only: [wanted as (typeof known)[number]] }
        : {}),
    });

    const rows = Object.entries(report.totals);

    if (argv.json) {
      logger.always(
        JSON.stringify(
          wanted ? { ...report, totals: Object.fromEntries(rows) } : report,
          null,
          2,
        ),
      );
      return;
    }

    const window =
      sinceDays === Infinity ? "all history" : `last ${argv.since} days`;
    logger.always(chalk.bold(`\nLocal CLI token usage — ${window}\n`));

    // A reader that ran and found nothing in the window is a different fact
    // from one that is not installed, and from one that failed. Printing a
    // block of zeros for it buries the rows that matter, so it gets one line.
    const quiet = rows.filter(([, t]) => t && t.requests === 0);
    const active = rows.filter(([, t]) => t && t.requests > 0);

    // What `requests` counts is not the same for every reader, so the label is
    // read off the descriptor rather than hard-coded. Printing "turns" for a
    // reader that counts sessions is a small lie that makes a Cursor row look
    // directly comparable to a Claude Code row, which it is not.
    const unitById = new Map(
      getLocalUsageDescriptors().map((d) => [d.id, d.requestUnit ?? "turn"]),
    );

    for (const [cliId, totals] of active) {
      if (!totals) {
        continue;
      }
      const cached = totals.cacheReadTokens + totals.cacheCreationTokens;
      logger.always(chalk.cyan(`  ${cliId}`));
      const unit = unitById.get(cliId as never) ?? "turn";
      logger.always(
        unit === "session-snapshot"
          ? `    sessions ${UsageCommandFactory.formatTokens(totals.requests)}` +
              chalk.dim("   (context snapshots, not per-turn usage)")
          : `    turns   ${UsageCommandFactory.formatTokens(totals.requests)}`,
      );
      logger.always(
        `    input   ${UsageCommandFactory.formatTokens(totals.inputTokens)}` +
          `    output ${UsageCommandFactory.formatTokens(totals.outputTokens)}` +
          `    cached ${UsageCommandFactory.formatTokens(cached)}`,
      );
      // Cost and its confidence are printed together, always. A dollar figure
      // shown without saying how it was arrived at is the thing this whole
      // subsystem is trying not to do: "unavailable" means the CLI is a
      // subscription and a per-token price would be invented, not that the
      // lookup failed.
      if (totals.costConfidence === "modeled") {
        logger.always(
          `    cost    ${chalk.green(`$${totals.costUsd.toFixed(2)}`)} (modeled)` +
            (totals.unpricedRequests > 0
              ? chalk.dim(
                  `  — ${totals.unpricedRequests} turns unpriced: ${totals.unpricedModels.join(", ")}`,
                )
              : ""),
        );
      } else {
        logger.always(
          `    cost    ${chalk.dim("unavailable")} ` +
            chalk.dim(
              totals.costConfidence === "heuristic"
                ? "(estimated, not measured)"
                : "(subscription — a per-token price would be invented)",
            ),
        );
      }
      logger.always("");
    }

    if (quiet.length > 0) {
      logger.always(
        chalk.dim(
          `  no usage in this window: ${quiet.map(([id]) => id).join(", ")}`,
        ),
      );
    }
    if (report.notInstalled.length > 0) {
      logger.always(
        chalk.dim(`  not installed: ${report.notInstalled.join(", ")}`),
      );
    }
    for (const failure of report.failures) {
      logger.always(
        chalk.yellow(`  ${failure.cliId} failed: ${failure.message}`),
      );
    }
    // A reader that read nine of ten transcripts still reports totals, and
    // those totals are wrong by the tenth. Printed next to the numbers they
    // undercut, because a silently short total is the failure mode this whole
    // command exists to avoid.
    if (report.scanErrors.length > 0) {
      logger.always(
        chalk.yellow(
          `  ${report.scanErrors.length} file(s) could not be read; totals are incomplete`,
        ),
      );
      for (const scanError of report.scanErrors.slice(0, 5)) {
        logger.always(
          chalk.dim(`    ${scanError.cliId}: ${scanError.message}`),
        );
      }
    }
    logger.always("");
  }
}
