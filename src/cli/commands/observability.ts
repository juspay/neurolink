#!/usr/bin/env node
/* eslint-disable no-console, curly */
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

/**
 * Observability command arguments
 */
type ObservabilityCommandArgs = {
  format?: "text" | "json" | "table";
  quiet?: boolean;
};

type StatusArgs = ObservabilityCommandArgs;
type MetricsArgs = ObservabilityCommandArgs & {
  detailed?: boolean;
};
type ExportersArgs = ObservabilityCommandArgs;
type CostsArgs = ObservabilityCommandArgs & {
  byModel?: boolean;
  byProvider?: boolean;
};

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

          if (spinner) spinner.succeed("Status retrieved");

          if (args.format === "json") {
            console.log(JSON.stringify(status, null, 2));
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Observability Status ==="));
            console.log("");

            // Telemetry enabled status
            const enabledIcon = status.enabled
              ? chalk.green("ON")
              : chalk.red("OFF");
            console.log(formatRow("Telemetry:", enabledIcon));

            // Langfuse status
            if (status.langfuse) {
              console.log("");
              console.log(chalk.bold("Langfuse:"));
              const lfStatus = status.langfuse.enabled
                ? chalk.green("Enabled")
                : chalk.gray("Disabled");
              console.log(formatRow("  Status:", lfStatus));
              if (status.langfuse.baseUrl) {
                console.log(formatRow("  URL:", status.langfuse.baseUrl));
              }
              if (status.langfuse.environment) {
                console.log(
                  formatRow("  Environment:", status.langfuse.environment),
                );
              }
            }

            // OpenTelemetry status
            if (status.openTelemetry) {
              console.log("");
              console.log(chalk.bold("OpenTelemetry:"));
              const otelStatus = status.openTelemetry.enabled
                ? chalk.green("Enabled")
                : chalk.gray("Disabled");
              console.log(formatRow("  Status:", otelStatus));
              if (status.openTelemetry.endpoint) {
                console.log(
                  formatRow("  Endpoint:", status.openTelemetry.endpoint),
                );
              }
              if (status.openTelemetry.serviceName) {
                console.log(
                  formatRow("  Service:", status.openTelemetry.serviceName),
                );
              }
            }

            // Exporters summary
            if (status.exporters && status.exporters.length > 0) {
              console.log("");
              console.log(chalk.bold("Active Exporters:"));
              for (const exporter of status.exporters) {
                const exporterStatus = exporter.healthy
                  ? chalk.green("Healthy")
                  : chalk.red("Unhealthy");
                console.log(formatRow(`  ${exporter.name}:`, exporterStatus));
              }
            }

            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to get status");
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

          if (spinner) spinner.succeed("Metrics retrieved");

          if (args.format === "json") {
            console.log(JSON.stringify(metrics, null, 2));
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Metrics Summary ==="));
            console.log("");

            // Request statistics
            console.log(chalk.bold("Request Statistics:"));
            console.log(
              formatRow(
                "  Total requests:",
                metrics.totalSpans.toLocaleString(),
              ),
            );
            console.log(
              formatRow(
                "  Successful:",
                metrics.successfulSpans.toLocaleString(),
              ),
            );
            console.log(
              formatRow("  Failed:", metrics.failedSpans.toLocaleString()),
            );
            console.log(
              formatRow(
                "  Success rate:",
                `${(metrics.successRate * 100).toFixed(2)}%`,
              ),
            );

            // Latency statistics
            if (metrics.latency && metrics.latency.count > 0) {
              console.log("");
              console.log(chalk.bold("Latency (ms):"));
              console.log(formatRow("  Min:", metrics.latency.min.toFixed(2)));
              console.log(formatRow("  Max:", metrics.latency.max.toFixed(2)));
              console.log(
                formatRow("  Mean:", metrics.latency.mean.toFixed(2)),
              );
              console.log(formatRow("  P50:", metrics.latency.p50.toFixed(2)));
              console.log(formatRow("  P95:", metrics.latency.p95.toFixed(2)));
              console.log(formatRow("  P99:", metrics.latency.p99.toFixed(2)));

              if (args.detailed) {
                console.log(
                  formatRow("  P75:", metrics.latency.p75.toFixed(2)),
                );
                console.log(
                  formatRow("  P90:", metrics.latency.p90.toFixed(2)),
                );
                console.log(
                  formatRow("  Std Dev:", metrics.latency.stdDev.toFixed(2)),
                );
              }
            }

            // Token statistics
            if (metrics.tokens) {
              console.log("");
              console.log(chalk.bold("Token Usage:"));
              console.log(
                formatRow(
                  "  Input tokens:",
                  metrics.tokens.totalInputTokens.toLocaleString(),
                ),
              );
              console.log(
                formatRow(
                  "  Output tokens:",
                  metrics.tokens.totalOutputTokens.toLocaleString(),
                ),
              );
              console.log(
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
                console.log(
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
                console.log(
                  formatRow(
                    "  Reasoning:",
                    metrics.tokens.reasoningTokens.toLocaleString(),
                  ),
                );
              }
            }

            // Cost
            if (metrics.totalCost !== undefined && metrics.totalCost > 0) {
              console.log("");
              console.log(chalk.bold("Cost:"));
              console.log(formatRow("  Total:", formatCost(metrics.totalCost)));
            }

            // Tracking duration
            if (metrics.trackingDurationMs) {
              const durationSec = metrics.trackingDurationMs / 1000;
              const throughput =
                metrics.totalSpans > 0 ? metrics.totalSpans / durationSec : 0;
              console.log("");
              console.log(
                chalk.gray(
                  `Tracking: ${durationSec.toFixed(1)}s (${throughput.toFixed(2)} req/s)`,
                ),
              );
            }

            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to get metrics");
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

          if (spinner) spinner.succeed("Exporters retrieved");

          const exporters = status.exporters ?? [];

          if (args.format === "json") {
            console.log(JSON.stringify(exporters, null, 2));
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Configured Exporters ==="));
            console.log("");

            if (exporters.length === 0) {
              console.log(chalk.gray("No exporters configured."));
              console.log("");
              console.log("Available exporters:");
              console.log("  - Langfuse (langfuse)");
              console.log("  - LangSmith (langsmith)");
              console.log("  - OpenTelemetry (otel)");
              console.log("  - Datadog (datadog)");
              console.log("  - Sentry (sentry)");
              console.log("  - Braintrust (braintrust)");
              console.log("  - Arize (arize)");
              console.log("  - PostHog (posthog)");
              console.log("  - Laminar (laminar)");
            } else {
              for (const exporter of exporters) {
                const healthIcon = exporter.healthy
                  ? chalk.green("[OK]")
                  : chalk.red("[ERROR]");

                console.log(`${healthIcon} ${chalk.bold(exporter.name)}`);

                if (exporter.latencyMs !== undefined) {
                  console.log(
                    formatRow(
                      "    Latency:",
                      `${exporter.latencyMs.toFixed(2)}ms`,
                    ),
                  );
                }

                if (exporter.pendingSpans !== undefined) {
                  console.log(
                    formatRow(
                      "    Pending spans:",
                      exporter.pendingSpans.toLocaleString(),
                    ),
                  );
                }

                if (exporter.lastExportTime) {
                  const lastExport = new Date(exporter.lastExportTime);
                  console.log(
                    formatRow("    Last export:", lastExport.toISOString()),
                  );
                }

                if (exporter.errors && exporter.errors.length > 0) {
                  console.log(chalk.yellow("    Errors:"));
                  for (const error of exporter.errors.slice(0, 3)) {
                    console.log(chalk.red(`      - ${error}`));
                  }
                }

                console.log("");
              }
            }
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to get exporters");
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

          if (spinner) spinner.succeed("Costs calculated");

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
            console.log(JSON.stringify(jsonOutput, null, 2));
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Cost Breakdown ==="));
            console.log("");

            // Total cost
            console.log(
              chalk.bold(`Total Cost: ${formatCost(metrics.totalCost ?? 0)}`),
            );

            // Cost by provider
            if (
              args.byProvider !== false &&
              metrics.costByProvider &&
              metrics.costByProvider.length > 0
            ) {
              console.log("");
              console.log(chalk.bold("By Provider:"));

              // Sort by cost descending
              const sortedProviders = [...metrics.costByProvider].sort(
                (a, b) => b.totalCost - a.totalCost,
              );

              for (const provider of sortedProviders) {
                const costStr = formatCost(provider.totalCost);
                const avgCost = formatCost(provider.avgCostPerRequest);
                console.log(
                  `  ${chalk.cyan(provider.provider.padEnd(15))} ${costStr}`,
                );
                console.log(
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
              console.log("");
              console.log(chalk.bold("By Model:"));

              // Sort by cost descending
              const sortedModels = [...metrics.costByModel].sort(
                (a, b) => b.totalCost - a.totalCost,
              );

              for (const model of sortedModels) {
                const costStr = formatCost(model.totalCost);
                const avgCost = formatCost(model.avgCostPerRequest);
                console.log(`  ${chalk.cyan(model.model)}`);
                console.log(`    Cost: ${costStr}`);
                console.log(
                  chalk.gray(
                    `    ${model.requestCount} requests, avg ${avgCost}/req`,
                  ),
                );
                console.log(
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
              console.log("");
              console.log(chalk.gray("No cost data available."));
              console.log(
                chalk.gray(
                  "Cost tracking is recorded when observability is enabled.",
                ),
              );
            }

            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to get costs");
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
