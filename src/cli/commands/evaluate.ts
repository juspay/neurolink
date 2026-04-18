#!/usr/bin/env node

/**
 * NeuroLink CLI Evaluate Command
 *
 * Evaluate AI responses using configured scorers and pipelines.
 * Supports subcommands: run, score, report, presets, scorers (list-scorers)
 */

import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import {
  EvaluationPipeline,
  getPreset,
  getPresetNames,
  PipelinePresets,
} from "../../lib/evaluation/pipeline/index.js";
import { ScorerRegistry } from "../../lib/evaluation/scorers/index.js";
import { ReportGenerator } from "../../lib/evaluation/reporting/reportGenerator.js";
import type {
  DirectEvaluateArgs,
  EvaluatePresetsArgs,
  EvaluateReportArgs,
  EvaluateRunArgs,
  EvaluateScoreArgs,
  EvaluateScorersArgs,
  PipelineConfig,
  ReportData,
  ReportFormat,
  RunPipelineArgs,
  ScorerInput,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

/**
 * Format score result for display
 */
function formatScoreResult(
  result: {
    scorerId: string;
    scorerName: string;
    score: number;
    passed: boolean;
    reasoning: string;
    computeTime: number;
  },
  verbose: boolean,
): string {
  const passIcon = result.passed ? chalk.green("PASS") : chalk.red("FAIL");
  const scoreColor = result.passed ? chalk.green : chalk.red;

  let output = `  ${passIcon} ${chalk.cyan(result.scorerName)}: ${scoreColor(result.score.toFixed(2))}`;

  if (verbose) {
    output += `\n     ${chalk.gray(result.reasoning)}`;
    output += `\n     ${chalk.gray(`(${result.computeTime}ms)`)}`;
  }

  return output;
}

/**
 * Check if a preset name is valid
 */
function isValidPreset(name: string): name is keyof typeof PipelinePresets {
  return name in PipelinePresets;
}

/**
 * Create scorer input from command arguments
 */
function createScorerInput(argv: {
  input?: string;
  output?: string;
  query?: string;
  context?: string[] | string;
  groundTruth?: string;
}): ScorerInput {
  // Handle context - can be array of strings or path to file
  let contextArray: string[] | undefined;
  if (argv.context) {
    if (typeof argv.context === "string") {
      // Check if it's a file path
      if (fs.existsSync(argv.context)) {
        try {
          const content = fs.readFileSync(argv.context, "utf-8");
          const parsed = JSON.parse(content);
          contextArray = Array.isArray(parsed) ? parsed : [content];
        } catch {
          contextArray = [argv.context];
        }
      } else {
        contextArray = [argv.context];
      }
    } else {
      contextArray = argv.context;
    }
  }

  return {
    query: argv.query ?? argv.input ?? "",
    response: argv.output ?? argv.input ?? "",
    context: contextArray,
    groundTruth: argv.groundTruth,
  };
}

/**
 * List-scorers subcommand - List all available scorers
 */
const listScorersCommand: CommandModule<object, EvaluateScorersArgs> = {
  command: "list-scorers",
  describe: "List all available scorers",
  builder: (yargs: Argv): Argv<EvaluateScorersArgs> =>
    yargs
      .option("category", {
        type: "string",
        describe:
          "Filter by category (accuracy, relevancy, safety, quality, faithfulness)",
      })
      .option("type", {
        type: "string",
        describe: "Filter by type (llm, rule)",
        choices: ["llm", "rule"],
      })
      .option("detailed", {
        type: "boolean",
        describe: "Show detailed scorer information",
        default: false,
      })
      .option("json", {
        type: "boolean",
        describe: "Output as JSON",
        default: false,
      })
      .example("$0 evaluate list-scorers", "List all scorers")
      .example(
        "$0 evaluate list-scorers --category safety",
        "List safety scorers",
      )
      .example(
        "$0 evaluate list-scorers --type rule --detailed",
        "List rule-based scorers with details",
      ),

  handler: async (
    argv: ArgumentsCamelCase<EvaluateScorersArgs>,
  ): Promise<void> => {
    const { category, type, json, detailed } = argv;

    await ScorerRegistry.registerBuiltInScorers();
    let scorerList = ScorerRegistry.list();

    // Apply filters
    if (category) {
      scorerList = scorerList.filter((s) => s.category === category);
    }
    if (type) {
      scorerList = scorerList.filter((s) => s.type === type);
    }

    if (json) {
      logger.always(JSON.stringify(scorerList, null, 2));
    } else {
      logger.always("");
      logger.always(chalk.bold("Available Scorers:"));
      logger.always(chalk.gray("-".repeat(60)));

      // Group by category
      const byCategory = new Map<string, typeof scorerList>();
      for (const s of scorerList) {
        const cat = s.category;
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
        }
        const categoryList = byCategory.get(cat);
        if (categoryList) {
          categoryList.push(s);
        }
      }

      for (const [cat, scorers] of byCategory) {
        logger.always("");
        logger.always(chalk.bold.underline(cat.toUpperCase()));

        for (const metadata of scorers) {
          const typeIcon = metadata.type === "llm" ? "AI" : "Rule";
          logger.always("");
          logger.always(`  ${chalk.cyan(metadata.id)} [${typeIcon}]`);
          logger.always(`    ${chalk.gray(metadata.description)}`);

          if (detailed) {
            logger.always(
              `    Required: ${metadata.requiredInputs.join(", ") || "none"}`,
            );
            if (metadata.optionalInputs.length > 0) {
              logger.always(
                `    Optional: ${metadata.optionalInputs.join(", ")}`,
              );
            }
          }
        }
      }

      logger.always("");
      logger.always(chalk.gray(`Total: ${scorerList.length} scorers`));
    }
  },
};

/**
 * Run-pipeline subcommand - Run evaluation using a predefined pipeline preset
 */
const runPipelineCommand: CommandModule<object, RunPipelineArgs> = {
  command: "run-pipeline",
  describe: "Run evaluation using a predefined pipeline preset",
  builder: (yargs: Argv) =>
    yargs
      .option("preset", {
        type: "string",
        describe: `Pipeline preset to use (${getPresetNames().join(", ")})`,
        alias: "p",
        demandOption: true,
      })
      .option("input", {
        type: "string",
        describe: "AI response text to evaluate",
        alias: "i",
        demandOption: true,
      })
      .option("query", {
        type: "string",
        describe: "Original user query",
        alias: "q",
      })
      .option("context", {
        type: "string",
        describe: "Path to context file (JSON format) or context string",
        alias: "c",
      })
      .option("threshold", {
        type: "number",
        describe: "Custom pass threshold (0-1)",
        alias: "t",
      })
      .option("format", {
        type: "string",
        describe: "Output format",
        choices: ["text", "json", "table"] as const,
        default: "text" as const,
      })
      .option("json", {
        type: "boolean",
        describe: "Output results as JSON (shorthand for --format json)",
        default: false,
      })
      .option("verbose", {
        type: "boolean",
        describe: "Show detailed reasoning and timing",
        alias: "v",
        default: false,
      })
      .example(
        '$0 evaluate run-pipeline --preset quality --input "The capital of France is Paris."',
        "Run quality evaluation",
      )
      .example(
        '$0 evaluate run-pipeline --preset rag --input "Response" --query "Question" --context ./context.json',
        "Run RAG evaluation with context file",
      ) as Argv<RunPipelineArgs>,

  handler: async (argv: ArgumentsCamelCase<RunPipelineArgs>): Promise<void> => {
    const { preset, input, query, context, threshold, json, verbose, format } =
      argv;

    const outputFormat = json ? "json" : format;
    const spinner =
      outputFormat === "json"
        ? null
        : ora(`Running ${preset} evaluation pipeline...`).start();

    try {
      if (!isValidPreset(preset)) {
        spinner?.fail(`Unknown pipeline preset: ${preset}`);
        logger.always(
          chalk.gray(`Available presets: ${getPresetNames().join(", ")}`),
        );
        process.exit(1);
      }

      const presetConfig = getPreset(preset);

      // Apply custom threshold if provided
      if (threshold !== undefined) {
        presetConfig.passThreshold = threshold;
      }

      const evaluationPipeline = new EvaluationPipeline(presetConfig);

      const scorerInput = createScorerInput({
        input: query,
        output: input,
        context,
      });

      await evaluationPipeline.initialize();
      const result = await evaluationPipeline.execute(scorerInput);

      spinner?.stop();

      if (outputFormat === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else if (outputFormat === "table") {
        logger.always("");
        logger.always(chalk.bold(`Pipeline: ${preset}`));
        logger.always(chalk.gray("-".repeat(50)));

        // Table header
        logger.always(
          `${chalk.bold("Scorer".padEnd(25))} ${chalk.bold("Score".padEnd(10))} ${chalk.bold("Status")}`,
        );
        logger.always(chalk.gray("-".repeat(50)));

        for (const score of result.scores) {
          const status = score.passed ? chalk.green("PASS") : chalk.red("FAIL");
          const scoreColor = score.passed ? chalk.green : chalk.red;
          logger.always(
            `${score.scorerName.padEnd(25)} ${scoreColor(score.score.toFixed(2).padEnd(10))} ${status}`,
          );
        }

        logger.always(chalk.gray("-".repeat(50)));
        const overallColor = result.passed ? chalk.green : chalk.red;
        logger.always(
          `${"Overall".padEnd(25)} ${overallColor(result.overallScore.toFixed(2).padEnd(10))} ${result.passed ? chalk.green("PASS") : chalk.red("FAIL")}`,
        );
      } else {
        // Text format
        logger.always("");
        logger.always(chalk.bold(`Pipeline: ${preset} Evaluation Results`));
        logger.always(chalk.gray("-".repeat(50)));

        const overallColor = result.passed ? chalk.green : chalk.red;
        const overallIcon = result.passed ? "PASS" : "FAIL";
        logger.always(
          `${overallColor(overallIcon)} Overall Score: ${overallColor(result.overallScore.toFixed(2))} (${result.aggregationMethod})`,
        );
        logger.always("");

        logger.always(chalk.bold("Individual Scores:"));
        for (const score of result.scores) {
          logger.always(formatScoreResult(score, verbose ?? false));
        }

        if (result.errors.length > 0) {
          logger.always("");
          logger.always(chalk.yellow("Errors:"));
          for (const error of result.errors) {
            logger.always(
              `  ${chalk.yellow("!")} ${error.scorerId}: ${error.error}`,
            );
          }
        }

        logger.always("");
        logger.always(chalk.gray(`Total time: ${result.totalComputeTime}ms`));
      }
    } catch (error) {
      spinner?.fail("Pipeline evaluation failed");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  },
};

/**
 * Run subcommand - Execute evaluation pipeline (legacy support)
 */
const runCommand: CommandModule<object, EvaluateRunArgs> = {
  command: "run",
  describe: "Run evaluation pipeline on a response",
  builder: (yargs: Argv): Argv<EvaluateRunArgs> =>
    yargs
      .option("input", {
        type: "string",
        describe: "Input query/question that was asked",
        alias: "i",
      })
      .option("output", {
        type: "string",
        describe: "Output/answer to evaluate",
        alias: "o",
      })
      .option("context", {
        type: "array",
        string: true,
        describe:
          "Context documents for RAG evaluation (can be used multiple times)",
        alias: "c",
      })
      .option("ground-truth", {
        type: "string",
        describe: "Expected/correct answer for accuracy evaluation",
        alias: "g",
      })
      .option("pipeline", {
        type: "string",
        describe: `Pipeline preset to use (${getPresetNames().join(", ")})`,
        alias: "p",
      })
      .option("scorer", {
        type: "array",
        string: true,
        describe: "Specific scorers to use (can be used multiple times)",
        alias: "s",
      })
      .option("json", {
        type: "boolean",
        describe: "Output results as JSON",
        default: false,
      })
      .option("verbose", {
        type: "boolean",
        describe: "Show detailed reasoning and timing",
        alias: "v",
        default: false,
      })
      .example(
        '$0 evaluate run -i "What is the capital of France?" -o "Paris" -p quality',
        "Evaluate a response using the quality pipeline",
      ),

  handler: async (argv: ArgumentsCamelCase<EvaluateRunArgs>): Promise<void> => {
    const {
      input,
      output,
      context,
      groundTruth,
      pipeline,
      scorer,
      json,
      verbose,
    } = argv;

    if (!input || !output) {
      logger.error(chalk.red("Error: Both --input and --output are required"));
      logger.always(chalk.gray("Use --help for usage information"));
      process.exit(1);
    }

    const spinner = json ? null : ora("Initializing evaluation...").start();

    try {
      const scorerInput = createScorerInput({
        input,
        output,
        context,
        groundTruth,
      });
      let evaluationPipeline: EvaluationPipeline;

      if (pipeline) {
        if (!isValidPreset(pipeline)) {
          spinner?.fail(`Unknown pipeline preset: ${pipeline}`);
          logger.always(
            chalk.gray(`Available presets: ${getPresetNames().join(", ")}`),
          );
          process.exit(1);
        }
        const presetConfig = getPreset(pipeline);
        evaluationPipeline = new EvaluationPipeline(presetConfig);
      } else if (scorer && scorer.length > 0) {
        const pipelineConfig: PipelineConfig = {
          name: "CLI Custom Pipeline",
          description: "Custom pipeline from CLI scorer arguments",
          scorers: scorer.map((s) => ({ id: s })),
          executionMode: "parallel",
        };
        evaluationPipeline = new EvaluationPipeline(pipelineConfig);
      } else {
        const defaultPreset = getPreset("quality");
        evaluationPipeline = new EvaluationPipeline(defaultPreset);
      }

      if (spinner) {
        spinner.text = "Running evaluation...";
      }

      await evaluationPipeline.initialize();
      const result = await evaluationPipeline.execute(scorerInput);

      spinner?.stop();

      if (json) {
        logger.always(JSON.stringify(result, null, 2));
      } else {
        logger.always("");
        logger.always(chalk.bold("Evaluation Results"));
        logger.always(chalk.gray("-".repeat(50)));

        const overallColor = result.passed ? chalk.green : chalk.red;
        const overallIcon = result.passed ? "PASS" : "FAIL";
        logger.always(
          `${overallColor(overallIcon)} Overall Score: ${overallColor(result.overallScore.toFixed(2))} (${result.aggregationMethod})`,
        );
        logger.always("");

        logger.always(chalk.bold("Individual Scores:"));
        for (const score of result.scores) {
          logger.always(formatScoreResult(score, verbose ?? false));
        }

        if (result.errors.length > 0) {
          logger.always("");
          logger.always(chalk.yellow("Errors:"));
          for (const error of result.errors) {
            logger.always(
              `  ${chalk.yellow("!")} ${error.scorerId}: ${error.error}`,
            );
          }
        }

        if (result.skippedScorers.length > 0 && verbose) {
          logger.always("");
          logger.always(
            chalk.gray(`Skipped: ${result.skippedScorers.join(", ")}`),
          );
        }

        logger.always("");
        logger.always(chalk.gray(`Total time: ${result.totalComputeTime}ms`));
      }
    } catch (error) {
      spinner?.fail("Evaluation failed");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  },
};

/**
 * Score subcommand - Score a single response with a specific scorer
 */
const scoreCommand: CommandModule<object, EvaluateScoreArgs> = {
  command: "score <scorer>",
  describe: "Score a response using a single scorer",
  builder: (yargs: Argv): Argv<EvaluateScoreArgs> =>
    yargs
      .positional("scorer", {
        type: "string",
        describe: "Scorer ID to use (e.g., hallucination, toxicity)",
        demandOption: true,
      })
      .option("input", {
        type: "string",
        describe: "Input query/question that was asked",
        alias: "i",
      })
      .option("output", {
        type: "string",
        describe: "Output/answer to evaluate",
        alias: "o",
      })
      .option("context", {
        type: "array",
        string: true,
        describe: "Context documents for evaluation",
        alias: "c",
      })
      .option("ground-truth", {
        type: "string",
        describe: "Expected answer for comparison",
        alias: "g",
      })
      .option("json", {
        type: "boolean",
        describe: "Output results as JSON",
        default: false,
      })
      .option("verbose", {
        type: "boolean",
        describe: "Show detailed output",
        alias: "v",
        default: false,
      })
      .example(
        '$0 evaluate score toxicity -o "This is a test response"',
        "Score a response for toxicity",
      )
      .example(
        '$0 evaluate score hallucination -i "What is 2+2?" -o "2+2 equals 4" --json',
        "Score for hallucinations and output JSON",
      ),

  handler: async (
    argv: ArgumentsCamelCase<EvaluateScoreArgs>,
  ): Promise<void> => {
    const { scorer, input, output, context, groundTruth, json, verbose } = argv;

    if (!output) {
      logger.error(chalk.red("Error: --output is required"));
      logger.always(chalk.gray("Use --help for usage information"));
      process.exit(1);
    }

    const spinnerInstance = json
      ? null
      : ora(`Loading scorer: ${scorer}...`).start();

    try {
      await ScorerRegistry.registerBuiltInScorers();
      const scorerInstance = await ScorerRegistry.getScorer(scorer);

      if (!scorerInstance) {
        spinnerInstance?.fail(`Scorer not found: ${scorer}`);
        const available = ScorerRegistry.list().map((s) => s.id);
        logger.always(chalk.gray(`Available scorers: ${available.join(", ")}`));
        process.exit(1);
      }

      if (spinnerInstance) {
        spinnerInstance.text = "Running scorer...";
      }

      const scorerInput = createScorerInput({
        input: input ?? "",
        output,
        context,
        groundTruth,
      });

      const validation = scorerInstance.validateInput(scorerInput);
      if (!validation.valid) {
        spinnerInstance?.fail("Input validation failed");
        for (const err of validation.errors) {
          logger.always(chalk.red(`  - ${err}`));
        }
        process.exit(1);
      }

      const result = await scorerInstance.score(scorerInput);

      spinnerInstance?.stop();

      if (json) {
        logger.always(JSON.stringify(result, null, 2));
      } else {
        logger.always("");
        logger.always(
          chalk.bold(
            `${result.scorerName} Score: ${result.score.toFixed(2)}/10`,
          ),
        );
        logger.always(
          result.passed
            ? chalk.green("  Status: PASSED")
            : chalk.red("  Status: FAILED"),
        );
        logger.always(`  Threshold: ${result.threshold}`);
        logger.always(`  Time: ${result.computeTime}ms`);

        if (verbose || !result.passed) {
          logger.always("");
          logger.always(chalk.gray("Reasoning:"));
          logger.always(chalk.gray(`  ${result.reasoning}`));
        }

        if (result.confidence !== undefined) {
          logger.always("");
          logger.always(
            chalk.gray(`Confidence: ${(result.confidence * 100).toFixed(1)}%`),
          );
        }

        if (verbose && result.metadata) {
          logger.always("");
          logger.always(chalk.gray("Metadata:"));
          logger.always(chalk.gray(JSON.stringify(result.metadata, null, 2)));
        }
      }
    } catch (error) {
      spinnerInstance?.fail("Scoring failed");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  },
};

/**
 * Report subcommand - Generate evaluation report
 */
const reportCommand: CommandModule = {
  command: "report",
  describe: "Generate an evaluation report",
  builder: (yargs: Argv) =>
    yargs
      .option("input", {
        type: "string",
        describe: "Input query/question that was asked",
        alias: "i",
      })
      .option("output", {
        type: "string",
        describe: "Output/answer to evaluate",
        alias: "o",
      })
      .option("context", {
        type: "array",
        string: true,
        describe: "Context documents for evaluation",
        alias: "c",
      })
      .option("ground-truth", {
        type: "string",
        describe: "Expected answer for comparison",
        alias: "g",
      })
      .option("pipeline", {
        type: "string",
        describe: `Pipeline preset to use (${getPresetNames().join(", ")})`,
        alias: "p",
      })
      .option("scorer", {
        type: "array",
        string: true,
        describe: "Specific scorers to use",
        alias: "s",
      })
      .option("format", {
        type: "string",
        describe: "Report format (text, json, markdown, html)",
        choices: ["text", "json", "markdown", "html"],
        default: "text",
      })
      .option("output-file", {
        type: "string",
        describe: "Save report to file",
        alias: "f",
      })
      .option("verbose", {
        type: "boolean",
        describe: "Include detailed information in report",
        alias: "v",
        default: true,
      })
      .example(
        '$0 evaluate report -i "Question" -o "Answer" -p quality --format markdown',
        "Generate markdown report",
      )
      .example(
        '$0 evaluate report -i "Question" -o "Answer" -p rag --format html -f report.html',
        "Generate HTML report and save to file",
      ),

  handler: async (
    argv: ArgumentsCamelCase<EvaluateReportArgs>,
  ): Promise<void> => {
    const {
      input,
      output,
      context,
      groundTruth,
      pipeline,
      scorer,
      format,
      outputFile,
      verbose,
    } = argv;

    if (!input || !output) {
      logger.error(chalk.red("Error: Both --input and --output are required"));
      logger.always(chalk.gray("Use --help for usage information"));
      process.exit(1);
    }

    const spinnerInstance = ora("Running evaluation...").start();

    try {
      const scorerInput = createScorerInput({
        input,
        output,
        context,
        groundTruth,
      });
      let evaluationPipeline: EvaluationPipeline;

      if (pipeline && isValidPreset(pipeline)) {
        evaluationPipeline = new EvaluationPipeline(getPreset(pipeline));
      } else if (scorer && scorer.length > 0) {
        const pipelineConfig: PipelineConfig = {
          name: "CLI Custom Pipeline",
          scorers: scorer.map((s) => ({ id: s })),
          executionMode: "parallel",
        };
        evaluationPipeline = new EvaluationPipeline(pipelineConfig);
      } else {
        evaluationPipeline = new EvaluationPipeline(getPreset("quality"));
      }

      await evaluationPipeline.initialize();
      const result = await evaluationPipeline.execute(scorerInput);

      spinnerInstance.text = "Generating report...";

      const reportData: ReportData = {
        title: `Evaluation Report - ${pipeline ?? "Custom Pipeline"}`,
        timestamp: Date.now(),
        result,
        customSections: [
          {
            title: "Input",
            content: { query: input, responseLength: output.length },
          },
        ],
      };

      const validFormats: ReportFormat[] = ["text", "json", "markdown", "html"];
      const reportFormat: ReportFormat = validFormats.includes(
        format as ReportFormat,
      )
        ? (format as ReportFormat)
        : "text";

      const generator = new ReportGenerator({
        format: reportFormat,
        includeReasoning: verbose ?? true,
        includeMetadata: verbose ?? true,
        includeTiming: true,
      });

      const report = generator.generate(reportData);

      spinnerInstance.stop();

      if (outputFile) {
        const fsPromises = await import("node:fs/promises");
        await fsPromises.writeFile(outputFile, report.content, "utf-8");
        logger.always(chalk.green(`Report saved to: ${outputFile}`));
      } else {
        logger.always(report.content);
      }
    } catch (error) {
      spinnerInstance.fail("Report generation failed");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  },
};

/**
 * Presets subcommand - List available pipeline presets
 */
const presetsCommand: CommandModule<object, EvaluatePresetsArgs> = {
  command: "presets [preset]",
  describe:
    "List available pipeline presets or show details of a specific preset",
  builder: (yargs: Argv): Argv<EvaluatePresetsArgs> =>
    yargs
      .positional("preset", {
        type: "string",
        describe: "Specific preset to show details for",
      })
      .option("json", {
        type: "boolean",
        describe: "Output as JSON",
        default: false,
      })
      .example("$0 evaluate presets", "List all available presets")
      .example("$0 evaluate presets rag", "Show details of the RAG preset"),

  handler: async (
    argv: ArgumentsCamelCase<EvaluatePresetsArgs>,
  ): Promise<void> => {
    const { preset, json } = argv;

    if (preset) {
      // Show specific preset details
      if (!isValidPreset(preset)) {
        logger.error(chalk.red(`Unknown preset: ${preset}`));
        logger.always(
          chalk.gray(`Available presets: ${getPresetNames().join(", ")}`),
        );
        process.exit(1);
      }

      const config = getPreset(preset);

      if (json) {
        logger.always(JSON.stringify(config, null, 2));
      } else {
        logger.always("");
        logger.always(chalk.bold(`Preset: ${chalk.cyan(preset)}`));
        logger.always(chalk.gray("-".repeat(50)));

        if (config.description) {
          logger.always(`Description: ${config.description}`);
        }

        logger.always(`Pass Threshold: ${config.passThreshold ?? 0.7}`);
        logger.always(`Execution Mode: ${config.executionMode ?? "parallel"}`);

        logger.always("");
        logger.always(chalk.bold("Scorers:"));
        for (const s of config.scorers) {
          const weight = s.config?.weight ?? 1.0;
          const threshold = s.config?.threshold ?? "default";
          logger.always(
            `  - ${chalk.cyan(s.id)} (weight: ${weight}, threshold: ${threshold})`,
          );
        }

        if (config.requiredScorers && config.requiredScorers.length > 0) {
          logger.always("");
          logger.always(
            chalk.bold("Required Scorers: ") +
              config.requiredScorers.join(", "),
          );
        }

        if (config.aggregation) {
          logger.always("");
          logger.always(
            chalk.bold("Aggregation: ") + config.aggregation.method,
          );
        }
      }
    } else {
      // List all presets
      const presets = getPresetNames();

      if (json) {
        const presetData = Object.fromEntries(
          presets.filter(isValidPreset).map((p) => [p, getPreset(p)]),
        );
        logger.always(JSON.stringify(presetData, null, 2));
      } else {
        logger.always("");
        logger.always(chalk.bold("Available Pipeline Presets:"));
        logger.always(chalk.gray("-".repeat(50)));

        for (const p of presets) {
          if (isValidPreset(p)) {
            const config = getPreset(p);
            logger.always("");
            logger.always(`  ${chalk.cyan(p)}`);
            if (config.description) {
              logger.always(`    ${chalk.gray(config.description)}`);
            }
            logger.always(
              `    Scorers: ${config.scorers.map((s) => s.id).join(", ")}`,
            );
          }
        }

        logger.always("");
        logger.always(
          chalk.gray(
            'Use "neurolink evaluate presets <name>" for more details',
          ),
        );
      }
    }
  },
};

/**
 * Main evaluate command with subcommands
 */
export const evaluateCommand: CommandModule<object, DirectEvaluateArgs> = {
  command: "evaluate [subcommand]",
  describe: "Evaluate AI responses using RAGAS-style scorers and pipelines",
  builder: (yargs: Argv) =>
    yargs
      .command(listScorersCommand)
      .command(runPipelineCommand)
      .command(runCommand)
      .command(scoreCommand)
      .command(reportCommand)
      .command(presetsCommand)
      .option("input", {
        type: "string",
        describe: "AI response text to evaluate",
        alias: "i",
      })
      .option("query", {
        type: "string",
        describe: "Original user query",
        alias: "q",
      })
      .option("scorers", {
        type: "array",
        string: true,
        describe: "List of scorers to use for evaluation",
        alias: "s",
      })
      .option("context", {
        type: "string",
        describe: "Path to context file (JSON format)",
        alias: "c",
      })
      .option("threshold", {
        type: "number",
        describe: "Minimum score threshold for passing (0-1)",
        alias: "t",
      })
      .option("format", {
        type: "string",
        describe: "Output format",
        choices: ["text", "json", "table"] as const,
        default: "text" as const,
      })
      .option("json", {
        type: "boolean",
        describe: "Output results as JSON (shorthand for --format json)",
        default: false,
      })
      .option("verbose", {
        type: "boolean",
        describe: "Show detailed reasoning and timing",
        alias: "v",
        default: false,
      })
      .example(
        '$0 evaluate --input "Response text" --query "User question" --scorers hallucination toxicity',
        "Evaluate with specific scorers",
      )
      .example(
        '$0 evaluate --input "Response" --query "Query" --context ./context.json --format json',
        "Evaluate with context file and JSON output",
      )
      .example("$0 evaluate list-scorers", "List all available scorers")
      .example(
        '$0 evaluate run-pipeline --preset quality --input "Response"',
        "Run quality pipeline evaluation",
      ) as Argv<DirectEvaluateArgs>,

  handler: async (
    argv: ArgumentsCamelCase<DirectEvaluateArgs>,
  ): Promise<void> => {
    const { input, query, scorers, context, threshold, json, verbose, format } =
      argv;

    // If no input provided and no subcommand executed, show help
    if (!input) {
      return;
    }

    const outputFormat = json ? "json" : format;
    const spinner =
      outputFormat === "json" ? null : ora("Running evaluation...").start();

    try {
      // Load context if provided
      let contextArray: string[] | undefined;
      if (context) {
        if (fs.existsSync(context)) {
          try {
            const content = fs.readFileSync(context, "utf-8");
            const parsed = JSON.parse(content);
            contextArray = Array.isArray(parsed) ? parsed : [content];
          } catch {
            contextArray = [context];
          }
        } else {
          contextArray = [context];
        }
      }

      const scorerInput: ScorerInput = {
        query: query ?? "",
        response: input,
        context: contextArray,
      };

      let evaluationPipeline: EvaluationPipeline;

      if (scorers && scorers.length > 0) {
        const pipelineConfig: PipelineConfig = {
          name: "CLI Custom Pipeline",
          description: "Custom pipeline from CLI scorer arguments",
          scorers: scorers.map((s) => ({ id: s })),
          executionMode: "parallel",
          passThreshold: threshold ?? 0.7,
        };
        evaluationPipeline = new EvaluationPipeline(pipelineConfig);
      } else {
        const defaultPreset = getPreset("quality");
        if (threshold !== undefined) {
          defaultPreset.passThreshold = threshold;
        }
        evaluationPipeline = new EvaluationPipeline(defaultPreset);
      }

      await evaluationPipeline.initialize();
      const result = await evaluationPipeline.execute(scorerInput);

      spinner?.stop();

      if (outputFormat === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else if (outputFormat === "table") {
        logger.always("");
        logger.always(chalk.bold("Evaluation Results"));
        logger.always(chalk.gray("-".repeat(50)));

        logger.always(
          `${chalk.bold("Scorer".padEnd(25))} ${chalk.bold("Score".padEnd(10))} ${chalk.bold("Status")}`,
        );
        logger.always(chalk.gray("-".repeat(50)));

        for (const score of result.scores) {
          const status = score.passed ? chalk.green("PASS") : chalk.red("FAIL");
          const scoreColor = score.passed ? chalk.green : chalk.red;
          logger.always(
            `${score.scorerName.padEnd(25)} ${scoreColor(score.score.toFixed(2).padEnd(10))} ${status}`,
          );
        }

        logger.always(chalk.gray("-".repeat(50)));
        const overallColor = result.passed ? chalk.green : chalk.red;
        logger.always(
          `${"Overall".padEnd(25)} ${overallColor(result.overallScore.toFixed(2).padEnd(10))} ${result.passed ? chalk.green("PASS") : chalk.red("FAIL")}`,
        );

        logger.always("");
        logger.always(chalk.gray(`Total time: ${result.totalComputeTime}ms`));
      } else {
        logger.always("");
        logger.always(chalk.bold("Evaluation Results"));
        logger.always(chalk.gray("-".repeat(50)));

        const overallColor = result.passed ? chalk.green : chalk.red;
        const overallIcon = result.passed ? "PASS" : "FAIL";
        logger.always(
          `${overallColor(overallIcon)} Overall Score: ${overallColor(result.overallScore.toFixed(2))} (${result.aggregationMethod})`,
        );
        logger.always("");

        logger.always(chalk.bold("Individual Scores:"));
        for (const score of result.scores) {
          logger.always(formatScoreResult(score, verbose ?? false));
        }

        if (result.errors.length > 0) {
          logger.always("");
          logger.always(chalk.yellow("Errors:"));
          for (const error of result.errors) {
            logger.always(
              `  ${chalk.yellow("!")} ${error.scorerId}: ${error.error}`,
            );
          }
        }

        logger.always("");
        logger.always(chalk.gray(`Total time: ${result.totalComputeTime}ms`));
      }
    } catch (error) {
      spinner?.fail("Evaluation failed");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  },
};

/**
 * Create evaluate command factory for CLICommandFactory
 */
export class EvaluateCommandFactory {
  /**
   * Create the evaluate command module
   */
  static createEvaluateCommand(): CommandModule {
    return evaluateCommand;
  }

  /**
   * List available scorers (utility method)
   */
  static async listScorers(): Promise<void> {
    await ScorerRegistry.registerBuiltInScorers();
    const scorerList = ScorerRegistry.list();

    logger.always(chalk.bold("Available Scorers:"));
    logger.always("");

    for (const metadata of scorerList) {
      logger.always(`  ${chalk.cyan(metadata.id)}`);
      logger.always(`    ${chalk.gray(metadata.description)}`);
      logger.always(
        `    Type: ${metadata.type}, Category: ${metadata.category}`,
      );
      logger.always("");
    }
  }

  /**
   * List available pipeline presets (utility method)
   */
  static listPipelines(): void {
    const presets = getPresetNames();

    logger.always(chalk.bold("Available Pipeline Presets:"));
    logger.always("");

    for (const preset of presets) {
      if (isValidPreset(preset)) {
        const config = getPreset(preset);
        logger.always(`  ${chalk.cyan(preset)}`);
        if (config.description) {
          logger.always(`    ${chalk.gray(config.description)}`);
        }
        logger.always(
          `    Scorers: ${config.scorers.map((s) => s.id).join(", ")}`,
        );
        logger.always("");
      }
    }
  }
}
