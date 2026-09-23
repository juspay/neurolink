#!/usr/bin/env node

/**
 * NeuroLink CLI Decide Command
 *
 * Calls `NeuroLink.decide()` — the third inference type, alongside `generate`
 * and `stream`. Takes a `state` plus a map of named typed questions and
 * prints one calibrated answer per question. See src/lib/types/decision.ts
 * for the full vocabulary.
 *
 * Credentials are env-only here, exactly as every other CLI command: the
 * decision provider (TypeSafe) reads `TYPESAFE_API_KEY` itself.
 */

import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import { readDecisionChoice } from "../../lib/utils/decisionAnswers.js";
import { calculateCost, hasPricing } from "../../lib/utils/pricing.js";
import type {
  CliDecideArgs,
  DecisionAnswerMap,
  DecisionError,
  DecisionErrorKind,
  DecisionQuestionMap,
  DecisionResult,
  DecisionState,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

const VALID_QUESTION_TYPES = new Set(["boolean", "choice", "score"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates that parsed JSON is a non-empty map of `{ type, ... }` question
 * objects. Runs before any provider work — a malformed `--questions` payload
 * must never reach the network.
 */
function isDecisionQuestionMap(value: unknown): value is DecisionQuestionMap {
  if (!isRecord(value)) {
    return false;
  }
  const ids = Object.keys(value);
  return (
    ids.length > 0 &&
    ids.every((id) => {
      const question = value[id];
      return (
        isRecord(question) &&
        typeof question.type === "string" &&
        VALID_QUESTION_TYPES.has(question.type)
      );
    })
  );
}

/** `state` is the raw text, or its parsed JSON when that JSON is an object or array. */
function parseState(raw: string): DecisionState {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) || Array.isArray(parsed)) {
      // Single assertion (CLAUDE.md rule 14 allows this) — `isRecord`/
      // `Array.isArray` narrow `unknown` down to a structural shape TS can't
      // itself equate with the recursive `DecisionInput` union.
      return parsed as DecisionState;
    }
  } catch {
    // Not JSON — treat as plain text.
  }
  return raw;
}

function isDecisionErrorCause(
  value: unknown,
): value is Pick<DecisionError, "kind" | "message"> {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    typeof value.message === "string"
  );
}

const ERROR_KIND_MESSAGES: Record<DecisionErrorKind, string> = {
  authentication:
    "Authentication failed — check the decision provider's API key.",
  invalid_request: "The decision provider rejected the request as invalid.",
  max_tokens_exceeded:
    "The decision request exceeded the provider's token limit.",
  rate_limit:
    "The decision provider is rate-limiting requests — try again shortly.",
  overloaded: "The decision provider is overloaded — try again shortly.",
  server: "The decision provider returned a server error.",
  timeout: "The decision request timed out.",
  network: "A network error occurred while calling the decision provider.",
};

/** One clean line describing a `decide()` failure — never a stack trace. */
function describeDecideError(error: unknown): string {
  const cause =
    error instanceof Error
      ? (error as Error & { cause?: unknown }).cause
      : undefined;
  if (isDecisionErrorCause(cause)) {
    const generic = ERROR_KIND_MESSAGES[cause.kind];
    if (!generic) {
      return cause.message;
    }
    // The provider's own text is what says which field or question was
    // rejected, so it is kept alongside the generic line.
    const detail = cause.message.trim();
    return detail && detail !== generic ? `${generic} (${detail})` : generic;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("No decision provider is configured")) {
    return "No decision provider is configured. Set TYPESAFE_API_KEY, or AI_GATEWAY_API_KEY for the Vercel AI Gateway route.";
  }
  return message;
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function formatAnswerLine(id: string, answers: DecisionAnswerMap): string {
  const answer = answers[id];
  if (!answer) {
    return `${id}: (no answer)`;
  }
  switch (answer.type) {
    case "boolean":
      return `${id}: probability ${formatNumber(answer.probability)}`;
    case "choice": {
      const reading = readDecisionChoice(answers, id);
      if (!reading) {
        return `${id}: (unreadable choice answer)`;
      }
      const alternatives = reading.ranked
        .filter((entry) => entry.name !== reading.choice)
        .slice(0, 2)
        .map((entry) => `${entry.name} (${formatNumber(entry.probability)})`)
        .join(", ");
      return (
        `${id}: choice ${reading.choice}, confidence ${formatNumber(reading.confidence)}` +
        (alternatives ? `, alternatives: ${alternatives}` : "")
      );
    }
    case "score":
      return `${id}: score ${formatNumber(answer.score)}, confidence ${formatNumber(answer.confidence)}`;
    default:
      return `${id}: (unrecognised answer type)`;
  }
}

function printTextResult(result: DecisionResult): void {
  for (const id of Object.keys(result.answers)) {
    logger.always(formatAnswerLine(id, result.answers));
  }
  logger.always("");
  logger.always(chalk.gray(`Model: ${result.model}`));
  logger.always(chalk.gray(`Latency: ${result.latencyMs}ms`));
  if (hasPricing(result.provider, result.model)) {
    const cost = calculateCost(result.provider, result.model, {
      input: result.usage.inputTokens,
      output: result.usage.outputTokens,
      total: result.usage.inputTokens + result.usage.outputTokens,
    });
    logger.always(chalk.gray(`Cost: $${cost.toFixed(6)}`));
  }
}

function readQuestionsSource(argv: CliDecideArgs): string {
  if (argv.questionsFile) {
    return fs.readFileSync(argv.questionsFile, "utf-8");
  }
  if (!argv.questions) {
    // Unreachable given the exactly-one-of check in the handler; keeps this
    // function sound on its own rather than asserting the type away.
    throw new Error("No questions source provided.");
  }
  return argv.questions;
}

function resolveState(argv: CliDecideArgs): DecisionState | undefined {
  if (argv.stateFile) {
    return parseState(fs.readFileSync(argv.stateFile, "utf-8"));
  }
  if (argv.state) {
    return parseState(argv.state);
  }
  return undefined;
}

export const decideCommand: CommandModule<object, CliDecideArgs> = {
  command: "decide [state]",
  describe:
    "Get typed, calibrated judgements from a decision model (no free text)",
  builder: (yargs: Argv) =>
    yargs
      .positional("state", {
        type: "string",
        describe: "The content to judge (or use --state-file)",
      })
      .option("state-file", {
        type: "string",
        describe: "Path to a file holding the state (text or JSON)",
      })
      .option("questions", {
        type: "string",
        describe:
          "Inline JSON map of questions (exactly one of this or --questions-file)",
      })
      .option("questions-file", {
        type: "string",
        describe: "Path to a JSON file holding the questions map",
      })
      .option("provider", {
        type: "string",
        describe: "Decision provider to use",
      })
      .option("model", {
        type: "string",
        describe: "Overrides the provider's configured model for this call",
      })
      .option("timeout", {
        type: "number",
        describe: "Timeout in milliseconds",
      })
      .option("format", {
        type: "string",
        alias: ["f", "output-format"],
        describe: "Output format",
        choices: ["text", "json"] as const,
        default: "text" as const,
      })
      .option("debug", {
        type: "boolean",
        alias: ["v", "verbose"],
        default: false,
        describe:
          "Enable debug logging (written to stderr when --format json is used)",
      })
      .example(
        '$0 decide "Refund request for a damaged item" --questions \'{"urgent":{"type":"boolean","instructions":"Is this urgent?"}}\'',
        "Ask a single yes/no question",
      )
      .example(
        "$0 decide --state-file ticket.json --questions-file questions.json --format json",
        "Read state and questions from files, emit raw JSON",
      ) as Argv<CliDecideArgs>,

  handler: async (argv: ArgumentsCamelCase<CliDecideArgs>): Promise<void> => {
    const outputFormat = argv.format ?? "text";

    // --- Validate before any provider work ---------------------------------
    if (!!argv.questions === !!argv.questionsFile) {
      logger.error(
        chalk.red(
          "Error: pass exactly one of --questions or --questions-file.",
        ),
      );
      process.exit(1);
    }

    let questionsRaw: string;
    try {
      questionsRaw = readQuestionsSource(argv);
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: could not read questions — ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }

    let parsedQuestions: unknown;
    try {
      parsedQuestions = JSON.parse(questionsRaw);
    } catch {
      const flag = argv.questionsFile ? "--questions-file" : "--questions";
      logger.error(chalk.red(`Error: ${flag} is not valid JSON.`));
      process.exit(1);
    }

    if (
      argv.timeout !== undefined &&
      !(Number.isFinite(argv.timeout) && argv.timeout > 0)
    ) {
      logger.error(
        chalk.red(
          "Error: --timeout must be a positive number of milliseconds.",
        ),
      );
      process.exit(1);
    }

    if (!isDecisionQuestionMap(parsedQuestions)) {
      logger.error(
        chalk.red(
          'Error: questions must be a non-empty object of { type: "boolean" | "choice" | "score", ... }.',
        ),
      );
      process.exit(1);
    }

    let state: DecisionState | undefined;
    try {
      state = resolveState(argv);
    } catch (error) {
      logger.error(
        chalk.red(
          `Error: could not read state file — ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }

    if (state === undefined) {
      logger.error(
        chalk.red(
          "Error: provide state as a positional argument or via --state-file.",
        ),
      );
      process.exit(1);
    }

    // --- Provider work -------------------------------------------------
    const spinner = outputFormat === "json" ? null : ora("Deciding...").start();

    try {
      const neurolink = new NeuroLink();
      const result = await neurolink.decide({
        state,
        questions: parsedQuestions,
        provider: argv.provider,
        model: argv.model,
        timeoutMs: argv.timeout,
      });

      spinner?.succeed("Decision complete");

      if (outputFormat === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else {
        printTextResult(result);
      }
    } catch (error) {
      spinner?.fail("Decision failed");
      logger.error(chalk.red(`Error: ${describeDecideError(error)}`));
      process.exit(1);
    }
  },
};

/**
 * Create decide command factory for CLICommandFactory-style registration,
 * matching the EvaluateCommandFactory pattern.
 */
export class DecideCommandFactory {
  static createDecideCommand(): CommandModule {
    return decideCommand;
  }
}
