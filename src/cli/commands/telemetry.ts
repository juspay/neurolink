#!/usr/bin/env node
/* eslint-disable no-console, curly */
/**
 * NeuroLink CLI Telemetry Commands
 *
 * Commands for managing telemetry and observability exporters:
 * - status: Show exporter status
 * - configure: Configure an exporter
 * - list-exporters: List configured exporters
 * - flush: Flush pending spans
 * - stats: Show token/cost stats
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { flushOpenTelemetry } from "../../lib/services/server/ai/observability/instrumentation.js";
import { formatRow, formatCost } from "../utils/formatters.js";
import type {
  ExporterName,
  TelemetryStatusArgs as StatusArgs,
  TelemetryConfigureArgs as ConfigureArgs,
  TelemetryListExportersArgs as ListExportersArgs,
  TelemetryFlushArgs as FlushArgs,
  TelemetryStatsArgs as StatsArgs,
} from "../../lib/types/index.js";

/**
 * Available exporter names
 */
const AVAILABLE_EXPORTERS = [
  "langfuse",
  "langsmith",
  "otel",
  "datadog",
  "sentry",
  "braintrust",
  "arize",
  "posthog",
  "laminar",
] as const;

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
      describe: "Telemetry and exporter management",
      builder: (yargs: Argv<object>) => {
        return yargs
          .command(TelemetryCommandFactory.createStatusCommand())
          .command(TelemetryCommandFactory.createConfigureCommand())
          .command(TelemetryCommandFactory.createListExportersCommand())
          .command(TelemetryCommandFactory.createFlushCommand())
          .command(TelemetryCommandFactory.createStatsCommand())
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
      describe: "Show exporter status and health",
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
          : ora("Checking exporter status...").start();

        try {
          const neurolink = new NeuroLink();
          const status = neurolink.getTelemetryStatus();

          if (spinner) spinner.succeed("Status retrieved");

          if (args.format === "json") {
            console.log(JSON.stringify(status, null, 2));
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Telemetry Status ==="));
            console.log("");

            // Telemetry enabled status
            const enabledIcon = status.enabled
              ? chalk.green("ENABLED")
              : chalk.red("DISABLED");
            console.log(formatRow("Telemetry:", enabledIcon));

            // OpenTelemetry status
            if (status.openTelemetry) {
              console.log("");
              console.log(chalk.bold("OpenTelemetry:"));
              const otelStatus = status.openTelemetry.enabled
                ? chalk.green("Active")
                : chalk.gray("Inactive");
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

            // Langfuse status
            if (status.langfuse) {
              console.log("");
              console.log(chalk.bold("Langfuse:"));
              const lfStatus = status.langfuse.enabled
                ? chalk.green("Active")
                : chalk.gray("Inactive");
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

            // Exporters health summary
            if (status.exporters && status.exporters.length > 0) {
              console.log("");
              console.log(chalk.bold("Exporter Health:"));
              for (const exporter of status.exporters) {
                const healthIcon = exporter.healthy
                  ? chalk.green("[OK]")
                  : chalk.red("[ERROR]");
                const pendingInfo = exporter.pendingSpans
                  ? chalk.gray(` (${exporter.pendingSpans} pending)`)
                  : "";
                console.log(`  ${healthIcon} ${exporter.name}${pendingInfo}`);

                if (exporter.errors && exporter.errors.length > 0) {
                  for (const error of exporter.errors.slice(0, 2)) {
                    console.log(chalk.red(`      Error: ${error}`));
                  }
                }
              }
            } else {
              console.log("");
              console.log(chalk.gray("No exporters configured."));
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
   * Create the configure subcommand
   */
  static createConfigureCommand(): CommandModule<object, ConfigureArgs> {
    return {
      command: "configure",
      describe: "Configure an exporter with JSON settings",
      builder: (yargs: Argv<object>) => {
        return yargs
          .option("exporter", {
            alias: "e",
            type: "string",
            demandOption: true,
            choices: AVAILABLE_EXPORTERS,
            describe: "Exporter name to configure",
          })
          .option("config", {
            alias: "c",
            type: "string",
            demandOption: true,
            describe: "JSON configuration string",
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
          }) as Argv<ConfigureArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet
          ? null
          : ora(`Configuring ${args.exporter} exporter...`).start();

        try {
          // Parse the JSON config
          let config: Record<string, unknown>;
          try {
            config = JSON.parse(args.config);
          } catch {
            if (spinner) spinner.fail("Invalid JSON configuration");
            console.log(chalk.red("Error: Configuration must be valid JSON"));
            console.log("");
            console.log("Example:");
            console.log(
              chalk.gray(
                `  neurolink telemetry configure --exporter langfuse --config '{"publicKey":"pk-...", "secretKey":"sk-..."}'`,
              ),
            );
            process.exit(1);
          }

          // Validate required fields based on exporter type
          const validationResult = validateExporterConfig(
            args.exporter as ExporterName,
            config,
          );
          if (!validationResult.valid) {
            if (spinner) spinner.fail("Configuration validation failed");
            console.log(chalk.red(`Error: ${validationResult.error}`));
            console.log("");
            console.log(chalk.yellow(`Required fields for ${args.exporter}:`));
            for (const field of validationResult.requiredFields ?? []) {
              console.log(chalk.gray(`  - ${field}`));
            }
            process.exit(1);
          }

          // Currently, exporter configuration is done via environment variables
          // or SDK initialization. This command provides guidance on how to configure.
          if (spinner)
            spinner.succeed(`${args.exporter} configuration validated`);

          if (args.format === "json") {
            console.log(
              JSON.stringify(
                {
                  exporter: args.exporter,
                  config: config,
                  valid: true,
                  message:
                    "Configuration validated. Set environment variables or use SDK initialization.",
                },
                null,
                2,
              ),
            );
          } else {
            console.log("");
            console.log(
              chalk.bold.cyan(`=== ${args.exporter} Configuration ===`),
            );
            console.log("");
            console.log(chalk.green("Configuration validated successfully!"));
            console.log("");
            console.log(chalk.bold("To apply this configuration:"));
            console.log("");

            // Show environment variable instructions
            const envVars = getExporterEnvVars(args.exporter as ExporterName);
            console.log(chalk.yellow("Option 1: Set environment variables"));
            for (const [key, description] of Object.entries(envVars)) {
              console.log(chalk.gray(`  export ${key}="<${description}>"`));
            }

            console.log("");
            console.log(chalk.yellow("Option 2: SDK initialization"));
            console.log(chalk.gray(`  const neurolink = new NeuroLink({`));
            console.log(chalk.gray(`    observability: {`));
            console.log(
              chalk.gray(
                `      ${args.exporter}: ${JSON.stringify(config, null, 6).split("\n").join("\n      ")}`,
              ),
            );
            console.log(chalk.gray(`    }`));
            console.log(chalk.gray(`  });`));

            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to configure exporter");
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
   * Create the list-exporters subcommand
   */
  static createListExportersCommand(): CommandModule<
    object,
    ListExportersArgs
  > {
    return {
      command: "list-exporters",
      aliases: ["list", "ls"],
      describe: "List all available and configured exporters",
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
          }) as Argv<ListExportersArgs>;
      },
      handler: async (args) => {
        const spinner = args.quiet ? null : ora("Listing exporters...").start();

        try {
          const neurolink = new NeuroLink();
          const status = neurolink.getTelemetryStatus();

          if (spinner) spinner.succeed("Exporters listed");

          const configuredExporters = status.exporters ?? [];
          const configuredNames = new Set(
            configuredExporters.map((e) => e.name.toLowerCase()),
          );

          if (args.format === "json") {
            console.log(
              JSON.stringify(
                {
                  available: AVAILABLE_EXPORTERS,
                  configured: configuredExporters,
                },
                null,
                2,
              ),
            );
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Available Exporters ==="));
            console.log("");

            for (const exporter of AVAILABLE_EXPORTERS) {
              const isConfigured = configuredNames.has(exporter);
              const configuredExporter = configuredExporters.find(
                (e) => e.name.toLowerCase() === exporter,
              );

              const statusIcon = isConfigured
                ? configuredExporter?.healthy
                  ? chalk.green("[ACTIVE]")
                  : chalk.yellow("[CONFIGURED]")
                : chalk.gray("[AVAILABLE]");

              const description = getExporterDescription(exporter);
              console.log(`${statusIcon} ${chalk.bold(exporter)}`);
              console.log(chalk.gray(`    ${description}`));

              if (isConfigured && configuredExporter) {
                if (configuredExporter.pendingSpans) {
                  console.log(
                    chalk.gray(
                      `    Pending spans: ${configuredExporter.pendingSpans}`,
                    ),
                  );
                }
                if (configuredExporter.lastExportTime) {
                  const lastExport = new Date(
                    configuredExporter.lastExportTime,
                  );
                  console.log(
                    chalk.gray(`    Last export: ${lastExport.toISOString()}`),
                  );
                }
              }
              console.log("");
            }

            console.log(chalk.bold("Configuration Help:"));
            console.log(
              chalk.gray(
                "  Use 'neurolink telemetry configure --exporter <name> --config <json>' to configure an exporter",
              ),
            );
            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to list exporters");
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
      describe: "Flush all pending spans to exporters",
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
          const neurolink = new NeuroLink();
          const statusBefore = neurolink.getTelemetryStatus();

          // Count pending spans before flush
          const pendingBefore =
            statusBefore.exporters?.reduce(
              (sum, e) => sum + (e.pendingSpans ?? 0),
              0,
            ) ?? 0;

          // Create a timeout promise
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
              () => reject(new Error("Flush operation timed out")),
              args.timeout ?? 30000,
            );
          });

          // Flush OpenTelemetry spans
          const flushPromise = flushOpenTelemetry();

          // Race between flush and timeout
          await Promise.race([flushPromise, timeoutPromise]);

          // Get status after flush
          const statusAfter = neurolink.getTelemetryStatus();
          const pendingAfter =
            statusAfter.exporters?.reduce(
              (sum, e) => sum + (e.pendingSpans ?? 0),
              0,
            ) ?? 0;

          const flushedCount = Math.max(0, pendingBefore - pendingAfter);

          if (spinner) spinner.succeed("Flush completed");

          if (args.format === "json") {
            console.log(
              JSON.stringify(
                {
                  success: true,
                  pendingBefore,
                  pendingAfter,
                  flushed: flushedCount,
                },
                null,
                2,
              ),
            );
          } else {
            console.log("");
            console.log(chalk.bold.cyan("=== Flush Complete ==="));
            console.log("");
            console.log(formatRow("Spans before:", pendingBefore.toString()));
            console.log(formatRow("Spans after:", pendingAfter.toString()));
            console.log(
              formatRow("Flushed:", chalk.green(flushedCount.toString())),
            );
            console.log("");
          }
        } catch (error) {
          if (spinner) spinner.fail("Failed to flush spans");
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

          if (spinner) spinner.succeed("Statistics retrieved");

          if (args.format === "json") {
            console.log(
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
            console.log("");
            console.log(chalk.bold.cyan("=== Token & Cost Statistics ==="));
            console.log("");

            // Token usage
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

            if (args.detailed) {
              if (metrics.tokens.cacheReadTokens > 0) {
                console.log(
                  formatRow(
                    "  Cache read:",
                    metrics.tokens.cacheReadTokens.toLocaleString(),
                  ),
                );
              }
              if (metrics.tokens.reasoningTokens > 0) {
                console.log(
                  formatRow(
                    "  Reasoning:",
                    metrics.tokens.reasoningTokens.toLocaleString(),
                  ),
                );
              }
            }

            // Cost summary
            console.log("");
            console.log(chalk.bold("Cost Summary:"));
            console.log(
              formatRow("  Total cost:", formatCost(metrics.totalCost ?? 0)),
            );

            // Cost by provider
            if (
              args.byProvider !== false &&
              metrics.costByProvider &&
              metrics.costByProvider.length > 0
            ) {
              console.log("");
              console.log(chalk.bold("Cost by Provider:"));
              const sortedProviders = [...metrics.costByProvider].sort(
                (a, b) => b.totalCost - a.totalCost,
              );
              for (const provider of sortedProviders) {
                console.log(
                  `  ${chalk.cyan(provider.provider.padEnd(15))} ${formatCost(provider.totalCost)}`,
                );
                console.log(
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
              console.log("");
              console.log(chalk.bold("Cost by Model:"));
              const sortedModels = [...metrics.costByModel].sort(
                (a, b) => b.totalCost - a.totalCost,
              );
              for (const model of sortedModels) {
                console.log(`  ${chalk.cyan(model.model)}`);
                console.log(`    Cost: ${formatCost(model.totalCost)}`);
                console.log(
                  chalk.gray(
                    `    ${model.requestCount} requests, avg ${formatCost(model.avgCostPerRequest)}/req`,
                  ),
                );
                if (args.detailed) {
                  console.log(
                    chalk.gray(
                      `    ${model.inputTokens.toLocaleString()} input, ${model.outputTokens.toLocaleString()} output tokens`,
                    ),
                  );
                }
              }
            }

            // Request statistics
            console.log("");
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

            // Latency (if detailed)
            if (args.detailed && metrics.latency.count > 0) {
              console.log("");
              console.log(chalk.bold("Latency (ms):"));
              console.log(formatRow("  P50:", metrics.latency.p50.toFixed(2)));
              console.log(formatRow("  P95:", metrics.latency.p95.toFixed(2)));
              console.log(formatRow("  P99:", metrics.latency.p99.toFixed(2)));
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
          if (spinner) spinner.fail("Failed to get statistics");
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

/**
 * Validate exporter configuration
 */
function validateExporterConfig(
  exporter: ExporterName,
  config: Record<string, unknown>,
): { valid: boolean; error?: string; requiredFields?: string[] } {
  const requiredFieldsMap: Record<ExporterName, string[]> = {
    langfuse: ["publicKey", "secretKey"],
    langsmith: ["apiKey"],
    otel: ["endpoint"],
    datadog: ["apiKey"],
    sentry: ["dsn"],
    braintrust: ["apiKey", "projectName"],
    arize: ["spaceKey", "apiKey"],
    posthog: ["apiKey"],
    laminar: ["apiKey"],
  };

  const requiredFields = requiredFieldsMap[exporter];
  const missingFields = requiredFields.filter(
    (field) => !(field in config) || !config[field],
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
      requiredFields,
    };
  }

  return { valid: true };
}

/**
 * Get environment variable names for an exporter
 */
function getExporterEnvVars(exporter: ExporterName): Record<string, string> {
  const envVarsMap: Record<ExporterName, Record<string, string>> = {
    langfuse: {
      LANGFUSE_PUBLIC_KEY: "your-public-key",
      LANGFUSE_SECRET_KEY: "your-secret-key",
      LANGFUSE_BASEURL: "https://cloud.langfuse.com (optional)",
    },
    langsmith: {
      LANGCHAIN_API_KEY: "your-api-key",
      LANGCHAIN_PROJECT: "your-project-name (optional)",
      LANGCHAIN_ENDPOINT: "https://api.smith.langchain.com (optional)",
    },
    otel: {
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
      OTEL_SERVICE_NAME: "your-service-name",
      OTEL_EXPORTER_OTLP_PROTOCOL: "http (or grpc)",
    },
    datadog: {
      DD_API_KEY: "your-api-key",
      DD_SITE: "datadoghq.com (or regional site)",
      DD_SERVICE: "your-service-name",
    },
    sentry: {
      SENTRY_DSN: "your-dsn-url",
      SENTRY_TRACES_SAMPLE_RATE: "1.0 (optional)",
      SENTRY_RELEASE: "your-release-version (optional)",
    },
    braintrust: {
      BRAINTRUST_API_KEY: "your-api-key",
      BRAINTRUST_PROJECT: "your-project-name",
    },
    arize: {
      ARIZE_SPACE_KEY: "your-space-key",
      ARIZE_API_KEY: "your-api-key",
    },
    posthog: {
      POSTHOG_API_KEY: "your-api-key",
      POSTHOG_HOST: "https://app.posthog.com (optional)",
    },
    laminar: {
      LAMINAR_API_KEY: "your-api-key",
      LAMINAR_BASE_URL: "https://api.laminar.run (optional)",
    },
  };

  return envVarsMap[exporter];
}

/**
 * Get description for an exporter
 */
function getExporterDescription(exporter: ExporterName): string {
  const descriptions: Record<ExporterName, string> = {
    langfuse:
      "Open-source LLM observability platform with traces and analytics",
    langsmith:
      "LangChain's platform for LLM application debugging and monitoring",
    otel: "OpenTelemetry Protocol (OTLP) for distributed tracing",
    datadog: "APM and infrastructure monitoring platform",
    sentry: "Error tracking and performance monitoring",
    braintrust: "AI evaluation and experimentation platform",
    arize: "ML observability platform for model monitoring",
    posthog: "Product analytics with LLM event tracking",
    laminar: "LLM application monitoring and debugging",
  };

  return descriptions[exporter];
}
