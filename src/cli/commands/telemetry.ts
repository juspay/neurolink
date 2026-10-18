#!/usr/bin/env node

/**
 * NeuroLink CLI Telemetry Commands
 *
 * Commands for managing telemetry:
 * - status: Show telemetry status
 * - flush: Flush pending spans
 * - stats: Show token/cost stats
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";
import {
  ensureTelemetry,
  flushOpenTelemetry,
} from "../../lib/services/server/ai/observability/instrumentation.js";
import { getExporterRegistry } from "../../lib/observability/exporterRegistry.js";
import {
  formatRow,
  formatCost,
  formatExporterLines,
  formatOtelStatus,
} from "../utils/formatters.js";
import { redactUrlCredentials } from "../../lib/utils/logSanitize.js";
import {
  prepareNativeTelemetry,
  validateNativeTelemetry,
} from "../utils/nativeTelemetry.js";
import type {
  TelemetryStatusArgs as StatusArgs,
  TelemetryFlushArgs as FlushArgs,
  TelemetryStatsArgs as StatsArgs,
  TelemetryNativePrepareArgs,
  TelemetryNativeValidateArgs,
} from "../../lib/types/index.js";

function exporterTotals(): {
  pending: number;
  delivered: number;
  failed: number;
} {
  return getExporterRegistry()
    .getStatuses()
    .reduce(
      (sum, exporter) => ({
        pending: sum.pending + exporter.pendingSpans,
        delivered: sum.delivered + exporter.deliveredSpans,
        failed: sum.failed + exporter.failedSpans,
      }),
      { pending: 0, delivered: 0, failed: 0 },
    );
}

/**
 * Telemetry Command Factory
 */
export class TelemetryCommandFactory {
  /**
   * Create the telemetry command group
   */
  static createTelemetryCommands(): CommandModule<object, object> {
    return {
      command: "telemetry <subcommand>",
      aliases: ["tel"],
      describe: "Telemetry management",
      builder: (yargs: Argv<object>) => {
        return yargs
          .command(TelemetryCommandFactory.createStatusCommand())
          .command(TelemetryCommandFactory.createFlushCommand())
          .command(TelemetryCommandFactory.createStatsCommand())
          .command(TelemetryCommandFactory.createNativePrepareCommand())
          .command(TelemetryCommandFactory.createNativeValidateCommand())
          .demandCommand(1, "Please specify a subcommand")
          .strict();
      },
      handler: () => {
        // This handler is not called directly due to demandCommand
      },
    };
  }

  /** Stage a native migration without modifying an installed service. */
  static createNativePrepareCommand(): CommandModule<
    object,
    TelemetryNativePrepareArgs
  > {
    return {
      command: "native-prepare",
      describe:
        "Stage private durable/split collector files; never activate a service",
      builder: (yargs: Argv<object>) =>
        yargs
          .option("collectorConfig", {
            alias: "collector-config",
            type: "string",
            demandOption: true,
            describe: "Existing native collector YAML (read only)",
          })
          .option("output", {
            type: "string",
            demandOption: true,
            describe:
              "New absolute staging directory; existing paths are refused",
          })
          .option("queueDirectory", {
            alias: "queue-directory",
            type: "string",
            demandOption: true,
            describe: "Planned private durable queue directory (not created)",
          })
          .option("compactionDirectory", {
            alias: "compaction-directory",
            type: "string",
            demandOption: true,
            describe:
              "Planned separate private compaction directory (not created)",
          })
          .option("bodyPort", {
            alias: "body-port",
            type: "number",
            default: 14319,
          })
          .option("bodyStream", {
            alias: "body-stream",
            type: "string",
            describe:
              "Separate body stream; defaults to <existing metadata stream>_bodies",
          })
          .option("metadataQueueMib", {
            alias: "metadata-queue-mib",
            type: "number",
            default: 32,
            describe: "Payload limit per metadata signal (three queues)",
          })
          .option("bodyQueueMib", {
            alias: "body-queue-mib",
            type: "number",
            default: 256,
          })
          .option("diskQuotaMib", {
            alias: "disk-quota-mib",
            type: "number",
            default: 1024,
            describe:
              "Operator-managed volume quota to review; not applied by this command",
          })
          .option("metadataRetentionDays", {
            alias: "metadata-retention-days",
            type: "number",
            default: 14,
            describe: "Planned backend retention; not applied",
          })
          .option("bodyRetentionDays", {
            alias: "body-retention-days",
            type: "number",
            default: 3,
            describe: "Planned backend body retention; not applied",
          }),
      handler: async (args) => {
        try {
          logger.always(
            JSON.stringify(await prepareNativeTelemetry(args), null, 2),
          );
        } catch (error) {
          logger.error(
            error instanceof Error
              ? error.message
              : "Native telemetry preparation failed",
          );
          process.exitCode = 1;
        }
      },
    };
  }

  static createNativeValidateCommand(): CommandModule<
    object,
    TelemetryNativeValidateArgs
  > {
    return {
      command: "native-validate",
      describe:
        "Validate staged profile using collector >= 0.160; never start or restart a service",
      builder: (yargs: Argv<object>) =>
        yargs
          .option("directory", {
            type: "string",
            demandOption: true,
            describe: "Private directory produced by native-prepare",
          })
          .option("collectorBin", {
            alias: "collector-bin",
            type: "string",
            demandOption: true,
            describe: "Absolute path to trusted otelcol-contrib executable",
          }),
      handler: async (args) => {
        try {
          logger.always(
            JSON.stringify(await validateNativeTelemetry(args), null, 2),
          );
        } catch (error) {
          logger.error(
            error instanceof Error
              ? error.message
              : "Native telemetry validation failed",
          );
          process.exitCode = 1;
        }
      },
    };
  }

  /**
   * Create the status subcommand
   */
  static createStatusCommand(): CommandModule<object, StatusArgs> {
    return {
      command: "status",
      describe: "Show telemetry status",
      builder: (yargs: Argv<object>) => {
        return yargs
          .option("format", {
            alias: "f",
            type: "string",
            choices: ["text", "json", "table"] as const,
            default: "text",
            describe: "Output format",
          })
          .option("quiet", {
            alias: "q",
            type: "boolean",
            default: false,
            describe: "Minimal output",
          }) as Argv<StatusArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet
          ? null
          : ora("Checking telemetry status...").start();

        try {
          // A one-shot process only starts telemetry with its first span, so
          // start it here to report the exporters this process would run.
          ensureTelemetry();
          const neurolink = new NeuroLink();
          const status = neurolink.getTelemetryStatus();

          if (spinner) {
            spinner.succeed("Status retrieved");
          }

          if (args.format === "json") {
            logger.always(
              JSON.stringify(
                status,
                (_key, value) =>
                  typeof value === "string" &&
                  (_key === "baseUrl" || _key === "endpoint")
                    ? redactUrlCredentials(value)
                    : value,
                2,
              ),
            );
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Telemetry Status ==="));
            logger.always("");

            // Telemetry enabled status
            const enabledIcon = status.enabled
              ? chalk.green("ENABLED")
              : chalk.red("DISABLED");
            logger.always(formatRow("Telemetry:", enabledIcon));

            // OpenTelemetry status
            if (status.openTelemetry) {
              logger.always("");
              logger.always(chalk.bold("OpenTelemetry:"));
              const otelStatus = formatOtelStatus(
                status.openTelemetry,
                "Active",
                "Inactive",
              );
              logger.always(formatRow("  Status:", otelStatus));
              if (status.openTelemetry.endpoint) {
                logger.always(
                  formatRow(
                    "  Endpoint:",
                    redactUrlCredentials(status.openTelemetry.endpoint),
                  ),
                );
              }
              if (status.openTelemetry.serviceName) {
                logger.always(
                  formatRow("  Service:", status.openTelemetry.serviceName),
                );
              }
            }

            // Langfuse status
            if (status.langfuse) {
              logger.always("");
              logger.always(chalk.bold("Langfuse:"));
              const lfStatus = status.langfuse.enabled
                ? chalk.green("Active")
                : chalk.gray("Inactive");
              logger.always(formatRow("  Status:", lfStatus));
              if (status.langfuse.baseUrl) {
                logger.always(
                  formatRow(
                    "  URL:",
                    redactUrlCredentials(status.langfuse.baseUrl),
                  ),
                );
              }
              if (status.langfuse.environment) {
                logger.always(
                  formatRow("  Environment:", status.langfuse.environment),
                );
              }
            }

            logger.always("");
            logger.always(chalk.bold("Exporters:"));
            for (const line of formatExporterLines(status.exporters)) {
              logger.always(line);
            }

            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to get status");
          }
          logger.error(
            "Error:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      },
    };
  }

  /**
   * Create the flush subcommand
   */
  static createFlushCommand(): CommandModule<object, FlushArgs> {
    return {
      command: "flush",
      describe: "Flush all pending spans",
      builder: (yargs: Argv<object>) => {
        return yargs
          .option("timeout", {
            alias: "t",
            type: "number",
            default: 30000,
            describe: "Timeout in milliseconds",
          })
          .option("format", {
            alias: "f",
            type: "string",
            choices: ["text", "json", "table"] as const,
            default: "text",
            describe: "Output format",
          })
          .option("quiet", {
            alias: "q",
            type: "boolean",
            default: false,
            describe: "Minimal output",
          }) as Argv<FlushArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet
          ? null
          : ora("Flushing pending spans...").start();

        try {
          const before = exporterTotals();

          // Create a timeout promise
          let flushTimer: ReturnType<typeof setTimeout> | undefined;
          const timeoutPromise = new Promise<void>((_, reject) => {
            flushTimer = setTimeout(
              () => reject(new Error("Flush operation timed out")),
              args.timeout ?? 30000,
            );
          });

          // Flush OpenTelemetry spans
          const flushPromise = flushOpenTelemetry();

          // Race between flush and timeout
          await Promise.race([flushPromise, timeoutPromise]);

          // Cancel the timeout timer to avoid unhandled rejection
          if (flushTimer !== undefined) {
            clearTimeout(flushTimer);
          }

          if (spinner) {
            spinner.succeed("Flush completed");
          }

          const after = exporterTotals();
          const flushed = after.delivered - before.delivered;
          const dropped = after.failed - before.failed;

          if (args.format === "json") {
            logger.always(
              JSON.stringify(
                {
                  success: true,
                  pendingBefore: before.pending,
                  pendingAfter: after.pending,
                  flushed,
                  dropped,
                },
                null,
                2,
              ),
            );
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Flush Complete ==="));
            logger.always("");
            logger.always(
              formatRow("Spans before:", before.pending.toString()),
            );
            logger.always(formatRow("Spans after:", after.pending.toString()));
            logger.always(
              formatRow("Flushed:", chalk.green(flushed.toString())),
            );
            logger.always(
              formatRow(
                "Dropped:",
                dropped > 0 ? chalk.red(dropped.toString()) : "0",
              ),
            );
            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to flush spans");
          }
          logger.error(
            "Error:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      },
    };
  }

  /**
   * Create the stats subcommand
   */
  static createStatsCommand(): CommandModule<object, StatsArgs> {
    return {
      command: "stats",
      describe: "Show token usage and cost statistics",
      builder: (yargs: Argv<object>) => {
        return yargs
          .option("format", {
            alias: "f",
            type: "string",
            choices: ["text", "json", "table"] as const,
            default: "text",
            describe: "Output format",
          })
          .option("detailed", {
            alias: "d",
            type: "boolean",
            default: false,
            describe: "Show detailed statistics",
          })
          .option("by-model", {
            alias: "m",
            type: "boolean",
            default: true,
            describe: "Show breakdown by model",
          })
          .option("by-provider", {
            alias: "p",
            type: "boolean",
            default: true,
            describe: "Show breakdown by provider",
          })
          .option("quiet", {
            alias: "q",
            type: "boolean",
            default: false,
            describe: "Minimal output",
          }) as Argv<StatsArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet
          ? null
          : ora("Gathering statistics...").start();

        try {
          const neurolink = new NeuroLink();
          const metrics = neurolink.getMetrics();

          if (spinner) {
            spinner.succeed("Statistics retrieved");
          }

          if (args.format === "json") {
            logger.always(
              JSON.stringify(
                {
                  tokens: {
                    input: metrics.tokens.totalInputTokens,
                    output: metrics.tokens.totalOutputTokens,
                    total: metrics.tokens.totalTokens,
                    cacheRead: metrics.tokens.cacheReadTokens,
                    reasoning: metrics.tokens.reasoningTokens,
                  },
                  cost: {
                    total: metrics.totalCost,
                    byProvider: metrics.costByProvider,
                    byModel: metrics.costByModel,
                  },
                  requests: {
                    total: metrics.totalSpans,
                    successful: metrics.successfulSpans,
                    failed: metrics.failedSpans,
                    successRate: metrics.successRate,
                  },
                  latency: metrics.latency,
                },
                null,
                2,
              ),
            );
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Token & Cost Statistics ==="));
            logger.always("");

            // Token usage
            logger.always(chalk.bold("Token Usage:"));
            logger.always(
              formatRow(
                "  Input tokens:",
                metrics.tokens.totalInputTokens.toLocaleString(),
              ),
            );
            logger.always(
              formatRow(
                "  Output tokens:",
                metrics.tokens.totalOutputTokens.toLocaleString(),
              ),
            );
            logger.always(
              formatRow(
                "  Total tokens:",
                metrics.tokens.totalTokens.toLocaleString(),
              ),
            );

            if (args.detailed) {
              if (metrics.tokens.cacheReadTokens > 0) {
                logger.always(
                  formatRow(
                    "  Cache read:",
                    metrics.tokens.cacheReadTokens.toLocaleString(),
                  ),
                );
              }
              if (metrics.tokens.reasoningTokens > 0) {
                logger.always(
                  formatRow(
                    "  Reasoning:",
                    metrics.tokens.reasoningTokens.toLocaleString(),
                  ),
                );
              }
            }

            // Cost summary
            logger.always("");
            logger.always(chalk.bold("Cost Summary:"));
            logger.always(
              formatRow("  Total cost:", formatCost(metrics.totalCost ?? 0)),
            );

            // Cost by provider
            if (
              args.byProvider !== false &&
              metrics.costByProvider &&
              metrics.costByProvider.length > 0
            ) {
              logger.always("");
              logger.always(chalk.bold("Cost by Provider:"));
              const sortedProviders = [...metrics.costByProvider].sort(
                (a, b) => b.totalCost - a.totalCost,
              );
              for (const provider of sortedProviders) {
                logger.always(
                  `  ${chalk.cyan(provider.provider.padEnd(15))} ${formatCost(provider.totalCost)}`,
                );
                logger.always(
                  chalk.gray(
                    `    ${provider.requestCount} requests, avg ${formatCost(provider.avgCostPerRequest)}/req`,
                  ),
                );
              }
            }

            // Cost by model
            if (
              args.byModel !== false &&
              metrics.costByModel &&
              metrics.costByModel.length > 0
            ) {
              logger.always("");
              logger.always(chalk.bold("Cost by Model:"));
              const sortedModels = [...metrics.costByModel].sort(
                (a, b) => b.totalCost - a.totalCost,
              );
              for (const model of sortedModels) {
                logger.always(`  ${chalk.cyan(model.model)}`);
                logger.always(`    Cost: ${formatCost(model.totalCost)}`);
                logger.always(
                  chalk.gray(
                    `    ${model.requestCount} requests, avg ${formatCost(model.avgCostPerRequest)}/req`,
                  ),
                );
                if (args.detailed) {
                  logger.always(
                    chalk.gray(
                      `    ${model.inputTokens.toLocaleString()} input, ${model.outputTokens.toLocaleString()} output tokens`,
                    ),
                  );
                }
              }
            }

            // Request statistics
            logger.always("");
            logger.always(chalk.bold("Request Statistics:"));
            logger.always(
              formatRow(
                "  Total requests:",
                metrics.totalSpans.toLocaleString(),
              ),
            );
            logger.always(
              formatRow(
                "  Successful:",
                metrics.successfulSpans.toLocaleString(),
              ),
            );
            logger.always(
              formatRow("  Failed:", metrics.failedSpans.toLocaleString()),
            );
            logger.always(
              formatRow(
                "  Success rate:",
                `${(metrics.successRate * 100).toFixed(2)}%`,
              ),
            );

            // Latency (if detailed)
            if (args.detailed && metrics.latency.count > 0) {
              logger.always("");
              logger.always(chalk.bold("Latency (ms):"));
              logger.always(
                formatRow("  P50:", metrics.latency.p50.toFixed(2)),
              );
              logger.always(
                formatRow("  P95:", metrics.latency.p95.toFixed(2)),
              );
              logger.always(
                formatRow("  P99:", metrics.latency.p99.toFixed(2)),
              );
            }

            // Tracking duration
            if (metrics.trackingDurationMs) {
              const durationSec = metrics.trackingDurationMs / 1000;
              const throughput =
                metrics.totalSpans > 0 ? metrics.totalSpans / durationSec : 0;
              logger.always("");
              logger.always(
                chalk.gray(
                  `Tracking: ${durationSec.toFixed(1)}s (${throughput.toFixed(2)} req/s)`,
                ),
              );
            }

            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to get statistics");
          }
          logger.error(
            "Error:",
            error instanceof Error ? error.message : String(error),
          );
          process.exit(1);
        }
      },
    };
  }
}
