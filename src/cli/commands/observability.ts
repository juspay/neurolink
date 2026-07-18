#!/usr/bin/env node

/**
 * NeuroLink CLI Observability Commands
 *
 * Commands for monitoring and managing observability features:
 * - status: Show telemetry status
 * - metrics: Show metrics summary
 * - exporters: List configured exporters
 * - costs: Show cost breakdown
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { formatRow, formatCost } from "../utils/formatters.js";
import { redactUrlCredentials } from "../../lib/utils/logSanitize.js";
import type {
  ObservabilityStatusArgs as StatusArgs,
  ObservabilityMetricsArgs as MetricsArgs,
  ObservabilityExportersArgs as ExportersArgs,
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
          .command(ObservabilityCommandFactory.createExportersCommand())
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
              const otelStatus = status.openTelemetry.enabled
                ? chalk.green("Enabled")
                : chalk.gray("Disabled");
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

            // Exporters summary
            if (status.exporters && status.exporters.length > 0) {
              logger.always("");
              logger.always(chalk.bold("Active Exporters:"));
              for (const exporter of status.exporters) {
                const exporterStatus = exporter.healthy
                  ? chalk.green("Healthy")
                  : chalk.red("Unhealthy");
                logger.always(formatRow(`  ${exporter.name}:`, exporterStatus));
              }
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
   * Create the exporters subcommand
   */
  static createExportersCommand(): CommandModule<object, ExportersArgs> {
    return {
      command: "exporters",
      aliases: ["exp"],
      describe: "List configured exporters",
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
          }) as Argv<ExportersArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet
          ? null
          : ora("Checking exporters...").start();

        try {
          const neurolink = new NeuroLink();
          const status = neurolink.getTelemetryStatus();

          if (spinner) {
            spinner.succeed("Exporters retrieved");
          }

          const exporters = status.exporters ?? [];

          if (args.format === "json") {
            logger.always(JSON.stringify(exporters, null, 2));
          } else {
            logger.always("");
            logger.always(chalk.bold.cyan("=== Configured Exporters ==="));
            logger.always("");

            if (exporters.length === 0) {
              logger.always(chalk.gray("No exporters configured."));
              logger.always("");
              logger.always("Available exporters:");
              logger.always("  - Langfuse (langfuse)");
              logger.always("  - LangSmith (langsmith)");
              logger.always("  - OpenTelemetry (otel)");
              logger.always("  - Datadog (datadog)");
              logger.always("  - Sentry (sentry)");
              logger.always("  - Braintrust (braintrust)");
              logger.always("  - Arize (arize)");
              logger.always("  - PostHog (posthog)");
              logger.always("  - Laminar (laminar)");
            } else {
              for (const exporter of exporters) {
                const healthIcon = exporter.healthy
                  ? chalk.green("[OK]")
                  : chalk.red("[ERROR]");

                logger.always(`${healthIcon} ${chalk.bold(exporter.name)}`);

                if (exporter.latencyMs !== undefined) {
                  logger.always(
                    formatRow(
                      "    Latency:",
                      `${exporter.latencyMs.toFixed(2)}ms`,
                    ),
                  );
                }

                if (exporter.pendingSpans !== undefined) {
                  logger.always(
                    formatRow(
                      "    Pending spans:",
                      exporter.pendingSpans.toLocaleString(),
                    ),
                  );
                }

                if (exporter.lastExportTime) {
                  const lastExport = new Date(exporter.lastExportTime);
                  logger.always(
                    formatRow("    Last export:", lastExport.toISOString()),
                  );
                }

                if (exporter.errors && exporter.errors.length > 0) {
                  logger.always(chalk.yellow("    Errors:"));
                  for (const error of exporter.errors.slice(0, 3)) {
                    logger.always(chalk.red(`      - ${error}`));
                  }
                }

                logger.always("");
              }
            }
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to get exporters");
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
