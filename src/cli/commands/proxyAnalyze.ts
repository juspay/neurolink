import type { Argv, CommandModule } from "yargs";
import chalk from "chalk";
import { analyzeProxyLogs } from "../../lib/proxy/proxyAnalysis.js";
import type {
  ProxyAnalyzeArgs,
  ProxyLatencySummary,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

function formatLatency(label: string, summary: ProxyLatencySummary): string {
  const value = (amount: number | null) =>
    amount === null ? "-" : amount.toFixed(1);
  return `${label.padEnd(22)} ${String(summary.count).padStart(7)} ${value(summary.p50).padStart(9)} ${value(summary.p95).padStart(9)} ${value(summary.p99).padStart(9)} ${value(summary.max).padStart(9)}`;
}

function printAnalysis(
  report: Awaited<ReturnType<typeof analyzeProxyLogs>>,
): void {
  logger.always("");
  logger.always(chalk.bold.cyan("NeuroLink Proxy Analysis"));
  logger.always(chalk.gray("=".repeat(50)));
  logger.always(`  Since:       ${chalk.cyan(report.since)}`);
  logger.always(`  Logs:        ${chalk.cyan(report.logsDir)}`);
  logger.always(
    `  Files:       ${report.files.requests} request, ${report.files.attempts} attempt, ${report.files.lifecycle} lifecycle`,
  );
  logger.always("");
  logger.always(chalk.bold("  Reliability"));
  logger.always(
    report.coverage.finalRequests
      ? `    Completed: ${report.requests.completed} (${chalk.green(`${report.requests.success} success`)}, ${chalk.red(`${report.requests.errors} errors`)})`
      : chalk.yellow("    Completed: unavailable (no final request logs)"),
  );
  logger.always(
    report.coverage.attempts && report.coverage.finalRequests
      ? `    Recovered after retry: ${report.requests.recoveredAfterRetry}`
      : chalk.yellow("    Recovered after retry: unavailable"),
  );
  if (report.requests.errors > 0) {
    logger.always(
      `    Final error types: ${JSON.stringify(report.requests.errorTypes)}`,
    );
  }
  if (report.coverage.attempts) {
    logger.always(
      `    Attempts: ${report.attempts.total}, ${report.attempts.errors} errors${report.attempts.errors > 0 ? ` ${JSON.stringify(report.attempts.errorTypes)}` : ""}`,
    );
  }
  logger.always(
    report.coverage.lifecycle
      ? `    Lifecycle: ${report.lifecycle.accepted} accepted, ${report.lifecycle.terminal} terminal, ${report.lifecycle.unsettled} unsettled`
      : chalk.yellow("    Lifecycle: unavailable (no lifecycle metadata)"),
  );
  if (report.coverage.attempts) {
    const finalRateLimits = report.coverage.finalRequests
      ? `${report.requests.finalRateLimits} final`
      : "final unavailable";
    logger.always(
      `    Rate limits: ${report.rateLimits.attemptRateLimits} attempts (${report.rateLimits.quota} quota, ${report.rateLimits.transient} transient, ${report.rateLimits.unclassified} unclassified), ${finalRateLimits}`,
    );
  } else if (report.coverage.finalRequests) {
    logger.always(
      chalk.yellow(
        `    Rate limits: attempt classification unavailable; ${report.requests.finalRateLimits} final 429 response(s)`,
      ),
    );
  } else {
    logger.always(chalk.yellow("    Rate limits: unavailable"));
  }
  logger.always("");
  logger.always(chalk.bold("  Latency (ms)"));
  const latencyHeader = `${"METRIC".padEnd(22)} ${"COUNT".padStart(7)} ${"P50".padStart(9)} ${"P95".padStart(9)} ${"P99".padStart(9)} ${"MAX".padStart(9)}`;
  logger.always(`    ${chalk.gray(latencyHeader)}`);
  logger.always(`    ${chalk.gray("-".repeat(latencyHeader.length))}`);
  for (const [label, summary] of [
    ["Response headers", report.latencyMs.headers],
    ["First chunk", report.latencyMs.firstChunk],
    ["Terminal", report.latencyMs.terminal],
    ["Final request log", report.latencyMs.finalRequest],
    ["Account attempt", report.latencyMs.attempt],
    ["Single-attempt delta", report.latencyMs.singleAttemptDelta],
  ] as [string, ProxyLatencySummary][]) {
    logger.always(`    ${formatLatency(label, summary)}`);
  }
  logger.always("");
  logger.always(chalk.bold("  Cache"));
  if (report.coverage.cacheUsage) {
    logger.always(
      `    Usage records: ${report.cache.requestsWithUsage}, cache-read requests: ${report.cache.requestsWithCacheRead}, hit rate: ${report.cache.requestHitRate === null ? "-" : `${(report.cache.requestHitRate * 100).toFixed(1)}%`}`,
    );
    logger.always(
      `    Tokens: ${report.cache.cacheReadTokens} read, ${report.cache.cacheCreationTokens} created, ${report.cache.inputTokens} input`,
    );
  } else {
    logger.always(chalk.yellow("    Cache usage: unavailable"));
  }
  logger.always("");
  logger.always(chalk.bold("  Data Quality"));
  logger.always(
    `    ${report.dataQuality.linesRead} lines scanned, ${report.dataQuality.malformedLines} malformed, ${report.dataQuality.unsupportedLifecycleLines} unsupported lifecycle, ${report.dataQuality.lifecycleSequenceGaps} sequence gaps, ${report.dataQuality.lifecycleSequenceDuplicates} duplicates`,
  );
  if (report.accounts.length > 0) {
    logger.always("");
    logger.always(chalk.bold("  Accounts"));
    const header = `${"ACCOUNT".padEnd(30)} ${"AUTH".padEnd(8)} ${"ATTEMPT".padStart(8)} ${"ATT ERR".padStart(7)} ${"FINAL".padStart(7)} ${"FIN ERR".padStart(7)} ${"QUOTA".padStart(7)} ${"TRANS".padStart(7)} ${"UNKNOWN".padStart(8)}`;
    logger.always(`    ${chalk.gray(header)}`);
    logger.always(`    ${chalk.gray("-".repeat(header.length))}`);
    for (const account of report.accounts) {
      const attempt = report.coverage.attempts ? String(account.attempts) : "-";
      const attemptErrors = report.coverage.attempts
        ? String(account.attemptErrors)
        : "-";
      const quota = report.coverage.attempts
        ? String(account.quotaRateLimits)
        : "-";
      const transient = report.coverage.attempts
        ? String(account.transientRateLimits)
        : "-";
      const unknown = report.coverage.attempts
        ? String(account.unclassifiedRateLimits)
        : "-";
      const finalRequests = report.coverage.finalRequests
        ? String(account.finalRequests)
        : "-";
      const finalErrors = report.coverage.finalRequests
        ? String(account.finalErrors)
        : "-";
      logger.always(
        `    ${account.account.slice(0, 30).padEnd(30)} ${account.accountType.slice(0, 8).padEnd(8)} ${attempt.padStart(8)} ${attemptErrors.padStart(7)} ${finalRequests.padStart(7)} ${finalErrors.padStart(7)} ${quota.padStart(7)} ${transient.padStart(7)} ${unknown.padStart(8)}`,
      );
    }
  }
  logger.always("");
}

export const proxyAnalyzeCommand: CommandModule<object, ProxyAnalyzeArgs> = {
  command: "analyze",
  describe: "Analyze local proxy reliability and latency logs",
  builder: (yargs: Argv) =>
    yargs
      .option("logs-dir", {
        type: "string",
        alias: "logsDir",
        description: "Proxy JSONL log directory",
      })
      .option("since", {
        type: "string",
        default: "24h",
        description: "ISO timestamp or lookback such as 6h, 1d, or 1w",
      })
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text" as const,
        description: "Output format",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        description: "Suppress non-essential output",
      })
      .example(
        "neurolink proxy analyze --since 24h",
        "Analyze the last 24 hours of proxy logs",
      ) as Argv<ProxyAnalyzeArgs>,
  handler: async (argv) => {
    try {
      const report = await analyzeProxyLogs({
        logsDir: argv.logsDir,
        since: argv.since,
      });
      if (argv.format === "json") {
        logger.always(JSON.stringify(report, null, 2));
        return;
      }
      printAnalysis(report);
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exitCode = 1;
    }
  },
};
