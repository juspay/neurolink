#!/usr/bin/env node

/**
 * NeuroLink CLI Observability Commands
 *
 * Commands for monitoring and managing observability features:
 * - status: Show telemetry status
 * - metrics: Show metrics summary
 * - costs: Show cost breakdown
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { ensureTelemetry } from "../../lib/services/server/ai/observability/instrumentation.js";
import {
  formatRow,
  formatCost,
  formatExporterLines,
  formatOtelStatus,
} from "../utils/formatters.js";
import { redactUrlCredentials } from "../../lib/utils/logSanitize.js";
import type {
  ObservabilityStatusArgs as StatusArgs,
  ObservabilityMetricsArgs as MetricsArgs,
  ObservabilityCostsArgs as CostsArgs,
} from "../../lib/types/index.js";

/**
 * Observability Command Factory
 */
export class ObservabilityCommandFactory {
  /**
   * Create the observability command group
   */
  static createObservabilityCommands(): CommandModule<object, object> {
    return {
      command: "observability <subcommand>",
      aliases: ["obs", "otel"],
      describe: "Observability and telemetry management",
      builder: (yargs: Argv<object>) => {
        return yargs
          .command(ObservabilityCommandFactory.createStatusCommand())
          .command(ObservabilityCommandFactory.createMetricsCommand())
          .command(ObservabilityCommandFactory.createCostsCommand())
          .demandCommand(1, "Please specify a subcommand")
          .strict();
      },
      handler: () => {
        // This handler is not called directly due to demandCommand
      },
    };
  }

  /**
   * Create the status subcommand
   */
  static createStatusCommand(): CommandModule<object, StatusArgs> {
    return {
      command: "status",
      describe: "Show telemetry and observability status",
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
          : ora("Checking observability status...").start();

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
            logger.always(chalk.bold.cyan("=== Observability Status ==="));
            logger.always("");

            // Telemetry enabled status
            const enabledIcon = status.enabled
              ? chalk.green("ON")
              : chalk.red("OFF");
            logger.always(formatRow("Telemetry:", enabledIcon));

            // Langfuse status
            if (status.langfuse) {
              logger.always("");
              logger.always(chalk.bold("Langfuse:"));
              const lfStatus = status.langfuse.enabled
                ? chalk.green("Enabled")
                : chalk.gray("Disabled");
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

            // OpenTelemetry status
            if (status.openTelemetry) {
              logger.always("");
              logger.always(chalk.bold("OpenTelemetry:"));
              const otelStatus = formatOtelStatus(
                status.openTelemetry,
                "Enabled",
                "Disabled",
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
   * Create the metrics subcommand
   */
  static createMetricsCommand(): CommandModule<object, MetricsArgs> {
    return {
      command: "metrics",
      describe: "Show metrics summary",
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
            describe: "Show detailed metrics including percentiles",
          })
          .option("quiet", {
            alias: "q",
            type: "boolean",
            default: false,
            describe: "Minimal output",
          }) as Argv<MetricsArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet ? null : ora("Gathering metrics...").start();

        try {
          const neurolink = new NeuroLink();
          const metrics = neurolink.getMetrics();

          if (spinner) {
            spinner.succeed("Metrics retrieved");
          }

          if (args.format === "json") {
            logger.always(JSON.stringify(metrics, null, 2));
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Metrics Summary ==="));
            logger.always("");

            // Request statistics
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

            // Latency statistics
            if (metrics.latency && metrics.latency.count > 0) {
              logger.always("");
              logger.always(chalk.bold("Latency (ms):"));
              logger.always(
                formatRow("  Min:", metrics.latency.min.toFixed(2)),
              );
              logger.always(
                formatRow("  Max:", metrics.latency.max.toFixed(2)),
              );
              logger.always(
                formatRow("  Mean:", metrics.latency.mean.toFixed(2)),
              );
              logger.always(
                formatRow("  P50:", metrics.latency.p50.toFixed(2)),
              );
              logger.always(
                formatRow("  P95:", metrics.latency.p95.toFixed(2)),
              );
              logger.always(
                formatRow("  P99:", metrics.latency.p99.toFixed(2)),
              );

              if (args.detailed) {
                logger.always(
                  formatRow("  P75:", metrics.latency.p75.toFixed(2)),
                );
                logger.always(
                  formatRow("  P90:", metrics.latency.p90.toFixed(2)),
                );
                logger.always(
                  formatRow("  Std Dev:", metrics.latency.stdDev.toFixed(2)),
                );
              }
            }

            // Token statistics
            if (metrics.tokens) {
              logger.always("");
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

              if (
                args.detailed &&
                metrics.tokens.cacheReadTokens &&
                metrics.tokens.cacheReadTokens > 0
              ) {
                logger.always(
                  formatRow(
                    "  Cache read:",
                    metrics.tokens.cacheReadTokens.toLocaleString(),
                  ),
                );
              }
              if (
                args.detailed &&
                metrics.tokens.reasoningTokens &&
                metrics.tokens.reasoningTokens > 0
              ) {
                logger.always(
                  formatRow(
                    "  Reasoning:",
                    metrics.tokens.reasoningTokens.toLocaleString(),
                  ),
                );
              }
            }

            // Cost
            if (metrics.totalCost !== undefined && metrics.totalCost > 0) {
              logger.always("");
              logger.always(chalk.bold("Cost:"));
              logger.always(
                formatRow("  Total:", formatCost(metrics.totalCost)),
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
            spinner.fail("Failed to get metrics");
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
   * Create the costs subcommand
   */
  static createCostsCommand(): CommandModule<object, CostsArgs> {
    return {
      command: "costs",
      aliases: ["cost"],
      describe: "Show cost breakdown",
      builder: (yargs: Argv<object>) => {
        return yargs
          .option("format", {
            alias: "f",
            type: "string",
            choices: ["text", "json", "table"] as const,
            default: "text",
            describe: "Output format",
          })
          .option("by-model", {
            alias: "m",
            type: "boolean",
            default: true,
            describe: "Show cost breakdown by model",
          })
          .option("by-provider", {
            alias: "p",
            type: "boolean",
            default: true,
            describe: "Show cost breakdown by provider",
          })
          .option("quiet", {
            alias: "q",
            type: "boolean",
            default: false,
            describe: "Minimal output",
          }) as Argv<CostsArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet ? null : ora("Calculating costs...").start();

        try {
          const neurolink = new NeuroLink();
          const metrics = neurolink.getMetrics();

          if (spinner) {
            spinner.succeed("Costs calculated");
          }

          if (args.format === "json") {
            const jsonOutput: Record<string, unknown> = {
              totalCost: metrics.totalCost,
            };
            if (args.byProvider !== false) {
              jsonOutput.costByProvider = metrics.costByProvider;
            }
            if (args.byModel !== false) {
              jsonOutput.costByModel = metrics.costByModel;
            }
            logger.always(JSON.stringify(jsonOutput, null, 2));
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Cost Breakdown ==="));
            logger.always("");

            // Total cost
            logger.always(
              chalk.bold(`Total Cost: ${formatCost(metrics.totalCost ?? 0)}`),
            );

            // Cost by provider
            if (
              args.byProvider !== false &&
              metrics.costByProvider &&
              metrics.costByProvider.length > 0
            ) {
              logger.always("");
              logger.always(chalk.bold("By Provider:"));

              // Sort by cost descending
              const sortedProviders = [...metrics.costByProvider].sort(
                (a, b) => b.totalCost - a.totalCost,
              );

              for (const provider of sortedProviders) {
                const costStr = formatCost(provider.totalCost);
                const avgCost = formatCost(provider.avgCostPerRequest);
                logger.always(
                  `  ${chalk.cyan(provider.provider.padEnd(15))} ${costStr}`,
                );
                logger.always(
                  chalk.gray(
                    `    ${provider.requestCount} requests, avg ${avgCost}/req`,
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
              logger.always(chalk.bold("By Model:"));

              // Sort by cost descending
              const sortedModels = [...metrics.costByModel].sort(
                (a, b) => b.totalCost - a.totalCost,
              );

              for (const model of sortedModels) {
                const costStr = formatCost(model.totalCost);
                const avgCost = formatCost(model.avgCostPerRequest);
                logger.always(`  ${chalk.cyan(model.model)}`);
                logger.always(`    Cost: ${costStr}`);
                logger.always(
                  chalk.gray(
                    `    ${model.requestCount} requests, avg ${avgCost}/req`,
                  ),
                );
                logger.always(
                  chalk.gray(
                    `    ${model.inputTokens.toLocaleString()} input, ${model.outputTokens.toLocaleString()} output tokens`,
                  ),
                );
              }
            }

            // No cost data
            if (
              (!metrics.costByProvider ||
                metrics.costByProvider.length === 0) &&
              (!metrics.costByModel || metrics.costByModel.length === 0)
            ) {
              logger.always("");
              logger.always(chalk.gray("No cost data available."));
              logger.always(
                chalk.gray(
                  "Cost tracking is recorded when observability is enabled.",
                ),
              );
            }

            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to get costs");
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
