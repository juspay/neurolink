#!/usr/bin/env node

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
import { redactUrlCredentials } from "../../lib/utils/logSanitize.js";
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
              const otelStatus = status.openTelemetry.enabled
                ? chalk.green("Active")
                : chalk.gray("Inactive");
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

            // Exporters health summary
            if (status.exporters && status.exporters.length > 0) {
              logger.always("");
              logger.always(chalk.bold("Exporter Health:"));
              for (const exporter of status.exporters) {
                const healthIcon = exporter.healthy
                  ? chalk.green("[OK]")
                  : chalk.red("[ERROR]");
                const pendingInfo = exporter.pendingSpans
                  ? chalk.gray(` (${exporter.pendingSpans} pending)`)
                  : "";
                logger.always(`  ${healthIcon} ${exporter.name}${pendingInfo}`);

                if (exporter.errors && exporter.errors.length > 0) {
                  for (const error of exporter.errors.slice(0, 2)) {
                    logger.always(chalk.red(`      Error: ${error}`));
                  }
                }
              }
            } else {
              logger.always("");
              logger.always(chalk.gray("No exporters configured."));
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
            if (spinner) {
              spinner.fail("Invalid JSON configuration");
            }
            logger.always(chalk.red("Error: Configuration must be valid JSON"));
            logger.always("");
            logger.always("Example:");
            logger.always(
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
            if (spinner) {
              spinner.fail("Configuration validation failed");
            }
            logger.always(chalk.red(`Error: ${validationResult.error}`));
            logger.always("");
            logger.always(
              chalk.yellow(`Required fields for ${args.exporter}:`),
            );
            for (const field of validationResult.requiredFields ?? []) {
              logger.always(chalk.gray(`  - ${field}`));
            }
            process.exit(1);
          }

          // Currently, exporter configuration is done via environment variables
          // or SDK initialization. This command provides guidance on how to configure.
          if (spinner) {
            spinner.succeed(`${args.exporter} configuration validated`);
          }

          if (args.format === "json") {
            logger.always(
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
            logger.always("");
            logger.always(
              chalk.bold.cyan(`=== ${args.exporter} Configuration ===`),
            );
            logger.always("");
            logger.always(chalk.green("Configuration validated successfully!"));
            logger.always("");
            logger.always(chalk.bold("To apply this configuration:"));
            logger.always("");

            // Show environment variable instructions
            const envVars = getExporterEnvVars(args.exporter as ExporterName);
            logger.always(chalk.yellow("Option 1: Set environment variables"));
            for (const [key, description] of Object.entries(envVars)) {
              logger.always(chalk.gray(`  export ${key}="<${description}>"`));
            }

            logger.always("");
            logger.always(chalk.yellow("Option 2: SDK initialization"));
            logger.always(chalk.gray(`  const neurolink = new NeuroLink({`));
            logger.always(chalk.gray(`    observability: {`));
            logger.always(
              chalk.gray(
                `      ${args.exporter}: ${JSON.stringify(config, null, 6).split("\n").join("\n      ")}`,
              ),
            );
            logger.always(chalk.gray(`    }`));
            logger.always(chalk.gray(`  });`));

            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to configure exporter");
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

          if (spinner) {
            spinner.succeed("Exporters listed");
          }

          const configuredExporters = status.exporters ?? [];
          const configuredNames = new Set(
            configuredExporters.map((e) => e.name.toLowerCase()),
          );

          if (args.format === "json") {
            logger.always(
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
            logger.always("");
            logger.always(chalk.bold.cyan("=== Available Exporters ==="));
            logger.always("");

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
              logger.always(`${statusIcon} ${chalk.bold(exporter)}`);
              logger.always(chalk.gray(`    ${description}`));

              if (isConfigured && configuredExporter) {
                if (configuredExporter.pendingSpans) {
                  logger.always(
                    chalk.gray(
                      `    Pending spans: ${configuredExporter.pendingSpans}`,
                    ),
                  );
                }
                if (configuredExporter.lastExportTime) {
                  const lastExport = new Date(
                    configuredExporter.lastExportTime,
                  );
                  logger.always(
                    chalk.gray(`    Last export: ${lastExport.toISOString()}`),
                  );
                }
              }
              logger.always("");
            }

            logger.always(chalk.bold("Configuration Help:"));
            logger.always(
              chalk.gray(
                "  Use 'neurolink telemetry configure --exporter <name> --config <json>' to configure an exporter",
              ),
            );
            logger.always("");
          }
        } catch (error) {
          if (spinner) {
            spinner.fail("Failed to list exporters");
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

          // Get status after flush
          const statusAfter = neurolink.getTelemetryStatus();
          const pendingAfter =
            statusAfter.exporters?.reduce(
              (sum, e) => sum + (e.pendingSpans ?? 0),
              0,
            ) ?? 0;

          const flushedCount = Math.max(0, pendingBefore - pendingAfter);

          if (spinner) {
            spinner.succeed("Flush completed");
          }

          if (args.format === "json") {
            logger.always(
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
            logger.always("");
            logger.always(chalk.bold.cyan("=== Flush Complete ==="));
            logger.always("");
            logger.always(formatRow("Spans before:", pendingBefore.toString()));
            logger.always(formatRow("Spans after:", pendingAfter.toString()));
            logger.always(
              formatRow("Flushed:", chalk.green(flushedCount.toString())),
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
