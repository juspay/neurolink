/**
 * CLI Processors Command
 *
 * Provides commands for listing, running, and validating I/O processors and presets.
 *
 * Commands:
 * - neurolink processor list                     - List available processors
 * - neurolink processor list-presets             - List processor presets
 * - neurolink processor run --preset <name> --input <text> - Run processors with input
 * - neurolink processor validate --config <file> - Validate processor config
 *
 * @module cli/commands/processors
 */

import type { CommandModule } from "yargs";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import {
  ProcessorPipeline,
  defaultRegistry,
  builtInPresets,
  getPresetNames,
  getPreset,
} from "../../lib/processors/index.js";
import type {
  InputProcessorData,
  ProcessorMetadata,
} from "../../lib/types/processorTypes.js";

/**
 * Processors list command arguments
 */
type ProcessorsListArgs = {
  type?: "input" | "output" | "all";
  json?: boolean;
};

/**
 * Processors presets command arguments
 */
type ProcessorsPresetsArgs = {
  json?: boolean;
  name?: string;
};

/**
 * Processors run command arguments
 */
type ProcessorsRunArgs = {
  preset: string;
  input: string;
  json?: boolean;
  provider?: string;
  model?: string;
};

/**
 * Processors validate command arguments
 */
type ProcessorsValidateArgs = {
  config: string;
  json?: boolean;
};

/**
 * Factory for creating processor-related CLI commands
 */
export class ProcessorsCommandFactory {
  /**
   * Create the main processors command group
   * Command: neurolink processor (or processors)
   */
  static createProcessorsCommands(): CommandModule {
    return {
      command: "processor <subcommand>",
      aliases: ["processors"],
      describe:
        "Manage I/O processors for input/output validation and transformation",
      builder: (yargs) => {
        return yargs
          .command(ProcessorsCommandFactory.createListCommand())
          .command(ProcessorsCommandFactory.createListPresetsCommand())
          .command(ProcessorsCommandFactory.createPresetsCommand())
          .command(ProcessorsCommandFactory.createRunCommand())
          .command(ProcessorsCommandFactory.createValidateCommand())
          .command(ProcessorsCommandFactory.createInfoCommand())
          .demandCommand(1, "Please specify a subcommand")
          .help();
      },
      handler: () => {
        // Parent command - no action
      },
    };
  }

  /**
   * Create the list command
   */
  static createListCommand(): CommandModule<object, ProcessorsListArgs> {
    return {
      command: "list",
      describe: "List all available processors",
      builder: (yargs) => {
        return yargs.options({
          type: {
            alias: "t",
            choices: ["input", "output", "all"] as const,
            default: "all" as const,
            description: "Filter by processor type",
          },
          json: {
            type: "boolean",
            default: false,
            description: "Output as JSON",
          },
        });
      },
      handler: async (argv) => {
        const allProcessors = defaultRegistry.listProcessors();
        const inputProcessors = allProcessors.input;
        const outputProcessors = allProcessors.output;

        if (argv.json) {
          const output: Record<string, unknown> = {};
          if (argv.type === "all" || argv.type === "input") {
            output.inputProcessors = inputProcessors;
          }
          if (argv.type === "all" || argv.type === "output") {
            output.outputProcessors = outputProcessors;
          }
          console.info(JSON.stringify(output, null, 2));
          return;
        }

        console.info(chalk.bold("\nNeuroLink I/O Processors\n"));

        if (argv.type === "all" || argv.type === "input") {
          console.info(chalk.cyan.bold("Input Processors:"));
          console.info(
            chalk.gray("  Transform and validate data before LLM processing\n"),
          );

          if (inputProcessors.length === 0) {
            console.info(chalk.yellow("  No input processors registered\n"));
          } else {
            for (const processor of inputProcessors) {
              console.info(chalk.green(`  ${processor.id}`));
              console.info(chalk.white(`    Name: ${processor.name}`));
              if (processor.description) {
                console.info(chalk.gray(`    ${processor.description}`));
              }
              if (processor.priority !== undefined) {
                console.info(chalk.gray(`    Priority: ${processor.priority}`));
              }
              console.info();
            }
          }
        }

        if (argv.type === "all" || argv.type === "output") {
          console.info(chalk.cyan.bold("Output Processors:"));
          console.info(chalk.gray("  Transform and validate LLM responses\n"));

          if (outputProcessors.length === 0) {
            console.info(chalk.yellow("  No output processors registered\n"));
          } else {
            for (const processor of outputProcessors) {
              console.info(chalk.green(`  ${processor.id}`));
              console.info(chalk.white(`    Name: ${processor.name}`));
              if (processor.description) {
                console.info(chalk.gray(`    ${processor.description}`));
              }
              if (processor.priority !== undefined) {
                console.info(chalk.gray(`    Priority: ${processor.priority}`));
              }
              console.info();
            }
          }
        }

        console.info(
          chalk.gray(
            "Use 'neurolink processors presets' to see pre-configured processor pipelines.",
          ),
        );
      },
    };
  }

  /**
   * Create the presets command
   */
  static createPresetsCommand(): CommandModule<object, ProcessorsPresetsArgs> {
    return {
      command: "presets [name]",
      describe: "List available presets or show details of a specific preset",
      builder: (yargs) => {
        return yargs
          .positional("name", {
            type: "string",
            description: "Preset name to show details for",
          })
          .options({
            json: {
              type: "boolean",
              default: false,
              description: "Output as JSON",
            },
          });
      },
      handler: async (argv) => {
        if (argv.name) {
          // Show specific preset details
          const preset = getPreset(argv.name);

          if (!preset) {
            console.info(chalk.red(`\nPreset '${argv.name}' not found.`));
            console.info(
              chalk.gray(`Available presets: ${getPresetNames().join(", ")}`),
            );
            return;
          }

          if (argv.json) {
            console.info(JSON.stringify(preset, null, 2));
            return;
          }

          console.info(chalk.bold(`\nPreset: ${preset.name}\n`));
          console.info(chalk.gray(`  ${preset.description}\n`));

          console.info(chalk.cyan.bold("  Input Processors:"));
          if (preset.inputProcessors.length === 0) {
            console.info(chalk.gray("    (none)"));
          } else {
            for (const p of preset.inputProcessors) {
              console.info(chalk.green(`    - ${p.id}`));
              if (p.config?.config) {
                console.info(
                  chalk.gray(
                    `      Config: ${JSON.stringify(p.config.config)}`,
                  ),
                );
              }
            }
          }
          console.info();

          console.info(chalk.cyan.bold("  Output Processors:"));
          if (preset.outputProcessors.length === 0) {
            console.info(chalk.gray("    (none)"));
          } else {
            for (const p of preset.outputProcessors) {
              console.info(chalk.green(`    - ${p.id}`));
              if (p.config?.config) {
                console.info(
                  chalk.gray(
                    `      Config: ${JSON.stringify(p.config.config)}`,
                  ),
                );
              }
            }
          }
          console.info();

          return;
        }

        // List all presets
        if (argv.json) {
          console.info(
            JSON.stringify(
              builtInPresets.map((p) => ({
                name: p.name,
                description: p.description,
                inputProcessorCount: p.inputProcessors.length,
                outputProcessorCount: p.outputProcessors.length,
              })),
              null,
              2,
            ),
          );
          return;
        }

        console.info(chalk.bold("\nAvailable Processor Presets\n"));
        console.info(
          chalk.gray(
            "Pre-configured processor pipelines for common use cases:\n",
          ),
        );

        for (const preset of builtInPresets) {
          console.info(chalk.green.bold(`  ${preset.name}`));
          console.info(chalk.gray(`    ${preset.description}`));
          console.info(
            chalk.white(
              `    Input: ${preset.inputProcessors.length} processor(s), Output: ${preset.outputProcessors.length} processor(s)`,
            ),
          );
          console.info();
        }

        console.info(
          chalk.gray(
            "Use 'neurolink processors presets <name>' for detailed configuration.",
          ),
        );
        console.info();
        console.info(chalk.cyan("Usage Example:"));
        console.info(
          chalk.gray(`
  // In SDK code:
  import { ProcessorPipeline, getPreset, ProcessorRegistry, defaultRegistry } from "@juspay/neurolink";

  // Use a preset
  const securityProcessors = defaultRegistry.buildFromPreset("security");

  // Or create a custom pipeline
  const pipeline = new ProcessorPipeline({
    inputProcessors: [...],
    outputProcessors: [...],
  });
`),
        );
      },
    };
  }

  /**
   * Create the info command
   */
  static createInfoCommand(): CommandModule {
    return {
      command: "info",
      describe: "Show information about the processor system",
      handler: async () => {
        const allProcessors = defaultRegistry.listProcessors();
        const inputProcessors = allProcessors.input;
        const outputProcessors = allProcessors.output;
        const presets = getPresetNames();

        console.info(chalk.bold("\nNeuroLink I/O Processor System\n"));

        console.info(chalk.cyan("Overview:"));
        console.info(
          chalk.gray(`  Processors provide input/output transformation and validation for LLM operations.
  They run in pipelines before (input) and after (output) the LLM call.
`),
        );

        console.info(chalk.cyan("Statistics:"));
        console.info(
          chalk.white(`  Input Processors:  ${inputProcessors.length}`),
        );
        console.info(
          chalk.white(`  Output Processors: ${outputProcessors.length}`),
        );
        console.info(chalk.white(`  Presets:           ${presets.length}`));
        console.info();

        console.info(chalk.cyan("Processor Types:"));
        console.info(
          chalk.gray(`
  Input Processors:
    - Memory Retrieval    Retrieves conversation history
    - Semantic Context    Searches for relevant context
    - Message Validation  Validates message structure
    - PII Detection       Detects/redacts personal information
    - Content Moderation  Checks for inappropriate content

  Output Processors:
    - Response Validation Validates response content
    - Length Validation   Checks response length
    - Content Filtering   Filters inappropriate content
    - Toxicity Check      Checks for toxic content
    - Memory Persistence  Stores conversation to memory
`),
        );

        console.info(chalk.cyan("Quick Start:"));
        console.info(
          chalk.gray(`
  // SDK usage with processors
  const result = await neurolink.generate({
    input: { text: "Hello, my email is test@example.com" },
    processors: {
      inputProcessors: [
        { processor: createPIIDetectionProcessor({ action: "redact" }) },
      ],
    },
  });
`),
        );

        console.info(chalk.gray("\nCommands:"));
        console.info(
          chalk.white(
            "  neurolink processor list          List all processors",
          ),
        );
        console.info(
          chalk.white(
            "  neurolink processor list-presets  List available presets",
          ),
        );
        console.info(
          chalk.white(
            "  neurolink processor run           Run processors on input",
          ),
        );
        console.info(
          chalk.white(
            "  neurolink processor validate      Validate processor config",
          ),
        );
        console.info(
          chalk.white(
            "  neurolink processor info          Show this information",
          ),
        );
        console.info();
      },
    };
  }

  /**
   * Create the list-presets command (alias for presets without name)
   * Command: neurolink processor list-presets
   */
  static createListPresetsCommand(): CommandModule<
    object,
    ProcessorsPresetsArgs
  > {
    return {
      command: "list-presets",
      describe: "List all available processor presets",
      builder: (yargs) => {
        return yargs.options({
          json: {
            type: "boolean",
            default: false,
            description: "Output as JSON",
          },
        });
      },
      handler: async (argv) => {
        if (argv.json) {
          console.info(
            JSON.stringify(
              builtInPresets.map((p) => ({
                name: p.name,
                description: p.description,
                inputProcessorCount: p.inputProcessors.length,
                outputProcessorCount: p.outputProcessors.length,
              })),
              null,
              2,
            ),
          );
          return;
        }

        console.info(chalk.bold("\nAvailable Processor Presets\n"));
        console.info(
          chalk.gray(
            "Pre-configured processor pipelines for common use cases:\n",
          ),
        );

        for (const preset of builtInPresets) {
          console.info(chalk.green.bold(`  ${preset.name}`));
          console.info(chalk.gray(`    ${preset.description}`));
          console.info(
            chalk.white(
              `    Input: ${preset.inputProcessors.length} processor(s), Output: ${preset.outputProcessors.length} processor(s)`,
            ),
          );
          console.info();
        }

        console.info(
          chalk.gray(
            "Use 'neurolink processor presets <name>' for detailed preset configuration.",
          ),
        );
        console.info(
          chalk.gray(
            "Use 'neurolink processor run --preset <name> --input <text>' to run processors.",
          ),
        );
      },
    };
  }

  /**
   * Create the run command
   * Command: neurolink processor run --preset <name> --input <text>
   */
  static createRunCommand(): CommandModule<object, ProcessorsRunArgs> {
    return {
      command: "run",
      describe: "Run processors on input text using a preset",
      builder: (yargs) => {
        return yargs.options({
          preset: {
            alias: "p",
            type: "string",
            demandOption: true,
            description: "Preset name to use (e.g., security, strict, quality)",
            choices: getPresetNames(),
          },
          input: {
            alias: "i",
            type: "string",
            demandOption: true,
            description: "Input text to process",
          },
          json: {
            type: "boolean",
            default: false,
            description: "Output as JSON",
          },
          provider: {
            type: "string",
            description: "Provider name for context (optional)",
          },
          model: {
            type: "string",
            description: "Model name for context (optional)",
          },
        });
      },
      handler: async (argv) => {
        const presetName = argv.preset;
        const inputText = argv.input;

        // Get processors from the preset using the registry
        const presetProcessors = defaultRegistry.buildFromPreset(presetName);

        if (!presetProcessors) {
          console.info(chalk.red(`\nPreset '${presetName}' not found.`));
          console.info(
            chalk.gray(`Available presets: ${getPresetNames().join(", ")}`),
          );
          process.exitCode = 1;
          return;
        }

        // Create a pipeline with the preset's processors
        const pipeline = new ProcessorPipeline({
          inputProcessors: presetProcessors.inputProcessors,
          outputProcessors: presetProcessors.outputProcessors,
          settings: {
            enableTracing: true,
          },
        });

        // Create input data for the pipeline
        const metadata: ProcessorMetadata = {
          requestId: `cli-${Date.now()}`,
          timestamp: Date.now(),
          provider: argv.provider,
          model: argv.model,
          custom: {},
          issues: [],
          processorTrace: [],
        };

        const inputData: InputProcessorData = {
          options: {} as never,
          messages: [
            { id: `msg-${Date.now()}`, role: "user", content: inputText },
          ],
          text: inputText,
          metadata,
        };

        try {
          // Run input processors
          const startTime = Date.now();
          const result = await pipeline.processInput(inputData);
          const executionTime = Date.now() - startTime;

          if (argv.json) {
            console.info(
              JSON.stringify(
                {
                  preset: presetName,
                  action: result.action,
                  executionTimeMs: executionTime,
                  issues: result.issues,
                  trace: result.metadata?.processorTrace,
                  feedback: result.feedback,
                  processedText: result.data?.text,
                },
                null,
                2,
              ),
            );
            return;
          }

          // Display header for non-JSON output
          console.info(
            chalk.bold(`\nRunning processors with preset: ${presetName}\n`),
          );

          // Display results
          console.info(chalk.cyan("Input:"));
          console.info(chalk.gray(`  "${inputText}"\n`));

          console.info(chalk.cyan("Result:"));
          console.info(
            chalk.white(
              `  Action: ${result.action === "continue" ? chalk.green(result.action) : chalk.red(result.action)}`,
            ),
          );
          console.info(chalk.white(`  Execution Time: ${executionTime}ms`));

          if (result.data?.text && result.data.text !== inputText) {
            console.info(chalk.cyan("\nProcessed Text:"));
            console.info(chalk.gray(`  "${result.data.text}"`));
          }

          if (result.feedback && result.feedback.length > 0) {
            console.info(chalk.cyan("\nFeedback:"));
            for (const fb of result.feedback) {
              console.info(chalk.yellow(`  - ${fb}`));
            }
          }

          if (result.issues && result.issues.length > 0) {
            console.info(chalk.cyan("\nIssues Detected:"));
            for (const issue of result.issues) {
              const severityColor =
                issue.severity === "error" || issue.severity === "critical"
                  ? chalk.red
                  : issue.severity === "warning"
                    ? chalk.yellow
                    : chalk.gray;
              console.info(
                severityColor(
                  `  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}`,
                ),
              );
            }
          }

          if (
            result.metadata?.processorTrace &&
            result.metadata.processorTrace.length > 0
          ) {
            console.info(chalk.cyan("\nProcessor Trace:"));
            for (const trace of result.metadata.processorTrace) {
              const actionColor =
                trace.action === "continue"
                  ? chalk.green
                  : trace.action === "abort"
                    ? chalk.red
                    : chalk.yellow;
              console.info(
                `  ${chalk.white(trace.processorName)} (${trace.processorId}): ${actionColor(trace.action)} [${trace.executionTime}ms]`,
              );
              if (trace.feedback) {
                console.info(chalk.gray(`    Feedback: ${trace.feedback}`));
              }
            }
          }

          console.info();

          if (result.action === "abort") {
            process.exitCode = 1;
          }
        } catch (error) {
          console.info(
            chalk.red(
              `\nError running processors: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
          process.exitCode = 1;
        }
      },
    };
  }

  /**
   * Create the validate command
   * Command: neurolink processor validate --config <file>
   */
  static createValidateCommand(): CommandModule<
    object,
    ProcessorsValidateArgs
  > {
    return {
      command: "validate",
      describe: "Validate a processor configuration file",
      builder: (yargs) => {
        return yargs.options({
          config: {
            alias: "c",
            type: "string",
            demandOption: true,
            description: "Path to processor configuration file (JSON)",
          },
          json: {
            type: "boolean",
            default: false,
            description: "Output as JSON",
          },
        });
      },
      handler: async (argv) => {
        const configPath = path.resolve(argv.config);

        // Check if file exists
        if (!fs.existsSync(configPath)) {
          const errorResult = {
            valid: false,
            errors: [`Configuration file not found: ${configPath}`],
          };

          if (argv.json) {
            console.info(JSON.stringify(errorResult, null, 2));
          } else {
            console.info(
              chalk.red(`\nConfiguration file not found: ${configPath}`),
            );
          }
          process.exitCode = 1;
          return;
        }

        try {
          // Read and parse the configuration file
          const configContent = fs.readFileSync(configPath, "utf-8");
          let config: unknown;

          try {
            config = JSON.parse(configContent);
          } catch (parseError) {
            const errorResult = {
              valid: false,
              errors: [
                `Invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              ],
            };

            if (argv.json) {
              console.info(JSON.stringify(errorResult, null, 2));
            } else {
              console.info(chalk.red("\nInvalid JSON in configuration file:"));
              console.info(
                chalk.yellow(
                  `  ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                ),
              );
            }
            process.exitCode = 1;
            return;
          }

          // Validate the configuration structure
          const validationResult =
            ProcessorsCommandFactory.validateProcessorConfig(
              config as Record<string, unknown>,
            );

          if (argv.json) {
            console.info(JSON.stringify(validationResult, null, 2));
            if (!validationResult.valid) {
              process.exitCode = 1;
            }
            return;
          }

          if (validationResult.valid) {
            console.info(chalk.green("\nConfiguration is valid!\n"));

            // Show summary
            const configObj = config as Record<string, unknown>;
            if (configObj.inputProcessors) {
              console.info(
                chalk.white(
                  `  Input Processors: ${(configObj.inputProcessors as unknown[]).length}`,
                ),
              );
            }
            if (configObj.outputProcessors) {
              console.info(
                chalk.white(
                  `  Output Processors: ${(configObj.outputProcessors as unknown[]).length}`,
                ),
              );
            }
            if (configObj.settings) {
              console.info(
                chalk.white(
                  `  Settings: ${JSON.stringify(configObj.settings)}`,
                ),
              );
            }

            if (
              validationResult.warnings &&
              validationResult.warnings.length > 0
            ) {
              console.info(chalk.yellow("\nWarnings:"));
              for (const warning of validationResult.warnings) {
                console.info(chalk.yellow(`  - ${warning}`));
              }
            }
          } else {
            console.info(chalk.red("\nConfiguration validation failed:\n"));
            for (const error of validationResult.errors) {
              console.info(chalk.red(`  - ${error}`));
            }
            process.exitCode = 1;
          }

          console.info();
        } catch (error) {
          const errorResult = {
            valid: false,
            errors: [
              `Error reading configuration: ${error instanceof Error ? error.message : String(error)}`,
            ],
          };

          if (argv.json) {
            console.info(JSON.stringify(errorResult, null, 2));
          } else {
            console.info(
              chalk.red(
                `\nError reading configuration: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
          process.exitCode = 1;
        }
      },
    };
  }

  /**
   * Validate processor configuration structure
   * @param config - Configuration object to validate
   * @returns Validation result with errors and warnings
   */
  private static validateProcessorConfig(config: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const registeredProcessors = defaultRegistry.listProcessors();
    const registeredInputIds = new Set(
      registeredProcessors.input.map((p) => p.id),
    );
    const registeredOutputIds = new Set(
      registeredProcessors.output.map((p) => p.id),
    );

    // Check for required structure
    if (typeof config !== "object" || config === null) {
      errors.push("Configuration must be a JSON object");
      return { valid: false, errors, warnings };
    }

    // Validate inputProcessors if present
    if (config.inputProcessors !== undefined) {
      if (!Array.isArray(config.inputProcessors)) {
        errors.push("inputProcessors must be an array");
      } else {
        for (let i = 0; i < config.inputProcessors.length; i++) {
          const processor = config.inputProcessors[i] as Record<
            string,
            unknown
          >;
          const prefix = `inputProcessors[${i}]`;

          if (typeof processor !== "object" || processor === null) {
            errors.push(`${prefix}: must be an object`);
            continue;
          }

          // Check for processor id or processor object
          if (processor.id !== undefined) {
            if (typeof processor.id !== "string") {
              errors.push(`${prefix}.id: must be a string`);
            } else if (!registeredInputIds.has(processor.id)) {
              warnings.push(
                `${prefix}.id: '${processor.id}' is not a registered input processor`,
              );
            }
          } else if (processor.processor !== undefined) {
            if (typeof processor.processor !== "object") {
              errors.push(`${prefix}.processor: must be a processor object`);
            }
          } else {
            errors.push(
              `${prefix}: must have either 'id' or 'processor' property`,
            );
          }

          // Validate config if present
          if (processor.config !== undefined) {
            if (
              typeof processor.config !== "object" ||
              processor.config === null
            ) {
              errors.push(`${prefix}.config: must be an object`);
            }
          }
        }
      }
    }

    // Validate outputProcessors if present
    if (config.outputProcessors !== undefined) {
      if (!Array.isArray(config.outputProcessors)) {
        errors.push("outputProcessors must be an array");
      } else {
        for (let i = 0; i < config.outputProcessors.length; i++) {
          const processor = config.outputProcessors[i] as Record<
            string,
            unknown
          >;
          const prefix = `outputProcessors[${i}]`;

          if (typeof processor !== "object" || processor === null) {
            errors.push(`${prefix}: must be an object`);
            continue;
          }

          // Check for processor id or processor object
          if (processor.id !== undefined) {
            if (typeof processor.id !== "string") {
              errors.push(`${prefix}.id: must be a string`);
            } else if (!registeredOutputIds.has(processor.id)) {
              warnings.push(
                `${prefix}.id: '${processor.id}' is not a registered output processor`,
              );
            }
          } else if (processor.processor !== undefined) {
            if (typeof processor.processor !== "object") {
              errors.push(`${prefix}.processor: must be a processor object`);
            }
          } else {
            errors.push(
              `${prefix}: must have either 'id' or 'processor' property`,
            );
          }

          // Validate config if present
          if (processor.config !== undefined) {
            if (
              typeof processor.config !== "object" ||
              processor.config === null
            ) {
              errors.push(`${prefix}.config: must be an object`);
            }
          }
        }
      }
    }

    // Validate settings if present
    if (config.settings !== undefined) {
      if (typeof config.settings !== "object" || config.settings === null) {
        errors.push("settings must be an object");
      } else {
        const settings = config.settings as Record<string, unknown>;

        if (
          settings.stopOnAbort !== undefined &&
          typeof settings.stopOnAbort !== "boolean"
        ) {
          errors.push("settings.stopOnAbort must be a boolean");
        }

        if (
          settings.maxTotalRetries !== undefined &&
          (typeof settings.maxTotalRetries !== "number" ||
            settings.maxTotalRetries < 0)
        ) {
          errors.push("settings.maxTotalRetries must be a non-negative number");
        }

        if (
          settings.pipelineTimeout !== undefined &&
          (typeof settings.pipelineTimeout !== "number" ||
            settings.pipelineTimeout < 0)
        ) {
          errors.push("settings.pipelineTimeout must be a non-negative number");
        }

        if (
          settings.enableTracing !== undefined &&
          typeof settings.enableTracing !== "boolean"
        ) {
          errors.push("settings.enableTracing must be a boolean");
        }
      }
    }

    // Check if at least one processor is defined
    if (
      (!config.inputProcessors ||
        (config.inputProcessors as unknown[]).length === 0) &&
      (!config.outputProcessors ||
        (config.outputProcessors as unknown[]).length === 0)
    ) {
      warnings.push(
        "No processors defined. Consider adding inputProcessors or outputProcessors.",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
