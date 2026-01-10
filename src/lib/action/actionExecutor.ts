// src/lib/action/actionExecutor.ts
/**
 * CLI execution for GitHub Action
 * @module action/actionExecutor
 */

import * as exec from "@actions/exec";
import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import type {
  ActionInputs,
  ActionExecutionResult,
  CliResponse,
  ActionTokenUsage,
  ActionEvaluation,
} from "../types/actionTypes.js";
import { buildEnvironmentVariables } from "./actionInputs.js";

/**
 * Transform CLI token usage format to action format
 */
function transformTokenUsage(
  cliUsage: CliResponse["usage"],
): ActionTokenUsage | undefined {
  if (!cliUsage) {
    return undefined;
  }
  return {
    promptTokens: cliUsage.input,
    completionTokens: cliUsage.output,
    totalTokens: cliUsage.total,
  };
}

/**
 * Transform CLI evaluation format to action format (scale 1-10 to 0-100)
 */
function transformEvaluation(
  cliEval: CliResponse["evaluation"],
): ActionEvaluation | undefined {
  if (!cliEval) {
    return undefined;
  }
  return {
    overallScore: cliEval.overall * 10, // Scale to 0-100
    relevance: cliEval.relevance,
    accuracy: cliEval.accuracy,
    completeness: cliEval.completeness,
  };
}

/**
 * Transform CLI response to action result format
 */
export function transformCliResponse(
  cliResponse: CliResponse,
): Omit<ActionExecutionResult, "success" | "error"> {
  return {
    response: cliResponse.content,
    responseJson: cliResponse as unknown as Record<string, unknown>,
    // Use top-level provider/model if available, otherwise fallback to analytics
    provider: cliResponse.provider || cliResponse.analytics?.provider,
    model: cliResponse.model || cliResponse.analytics?.model,
    usage: transformTokenUsage(cliResponse.usage),
    cost: cliResponse.analytics?.cost,
    executionTime: cliResponse.responseTime,
    evaluation: transformEvaluation(cliResponse.evaluation),
  };
}

/**
 * Build CLI arguments from action inputs (using verified camelCase flags)
 */
export function buildCliArgs(inputs: ActionInputs): string[] {
  const args: string[] = [inputs.command, inputs.prompt];

  // Provider & Model
  if (inputs.provider && inputs.provider !== "auto") {
    args.push("--provider", inputs.provider);
  }
  if (inputs.model) {
    args.push("--model", inputs.model);
  }

  // Generation parameters (camelCase flags!)
  if (inputs.temperature !== undefined) {
    args.push("--temperature", inputs.temperature.toString());
  }
  if (inputs.maxTokens !== undefined) {
    args.push("--maxTokens", inputs.maxTokens.toString()); // NOT --max-tokens
  }
  if (inputs.systemPrompt) {
    args.push("--system", inputs.systemPrompt);
  }

  // Output format (always JSON for parsing)
  args.push("--format", "json");
  args.push("--quiet");
  args.push("--noColor");

  // Multimodal inputs
  const { multimodal } = inputs;
  if (multimodal.imagePaths) {
    for (const img of multimodal.imagePaths) {
      args.push("--image", img);
    }
  }
  if (multimodal.pdfPaths) {
    for (const pdf of multimodal.pdfPaths) {
      args.push("--pdf", pdf);
    }
  }
  if (multimodal.csvPaths) {
    for (const csv of multimodal.csvPaths) {
      args.push("--csv", csv);
    }
  }
  if (multimodal.videoPaths) {
    for (const video of multimodal.videoPaths) {
      args.push("--video", video);
    }
  }

  // Extended thinking (camelCase flags!)
  if (inputs.thinking.enabled) {
    args.push("--thinking");
    args.push("--thinkingLevel", inputs.thinking.level); // NOT --thinking-level
    args.push("--thinkingBudget", inputs.thinking.budget.toString()); // NOT --thinking-budget
  }

  // Features (camelCase flags!)
  if (inputs.enableAnalytics) {
    args.push("--enableAnalytics"); // NOT --enable-analytics
  }
  if (inputs.enableEvaluation) {
    args.push("--enableEvaluation"); // NOT --enable-evaluation
  }

  // Timeout
  if (inputs.timeout) {
    args.push("--timeout", inputs.timeout.toString());
  }

  // Output file
  if (inputs.outputFile) {
    args.push("--output", inputs.outputFile);
  }

  // Debug
  if (inputs.debug) {
    args.push("--debug");
  }

  return args;
}

/**
 * Install NeuroLink CLI
 */
export async function installNeurolink(version: string): Promise<void> {
  core.info(`Installing @juspay/neurolink@${version}...`);

  const installArgs =
    version === "latest"
      ? ["install", "-g", "@juspay/neurolink"]
      : ["install", "-g", `@juspay/neurolink@${version}`];

  await exec.exec("npm", installArgs, {
    silent: !core.isDebug(),
  });

  core.info("NeuroLink CLI installed successfully");
}

/**
 * Execute NeuroLink CLI command
 */
export async function executeNeurolink(
  args: string[],
  env: Record<string, string>,
  workingDirectory?: string,
): Promise<ActionExecutionResult> {
  const startTime = Date.now();

  try {
    // Filter out undefined values from process.env
    const processEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        processEnv[key] = value;
      }
    }

    const { exitCode, stdout, stderr } = await exec.getExecOutput(
      "neurolink",
      args,
      {
        cwd: workingDirectory,
        env: { ...processEnv, ...env },
        silent: false,
        ignoreReturnCode: true,
      },
    );

    const executionTime = Date.now() - startTime;

    if (exitCode !== 0) {
      return {
        success: false,
        response: "",
        error: stderr || `CLI exited with code ${exitCode}`,
        executionTime,
      };
    }

    // Parse JSON output
    try {
      // The CLI output may have log lines before the JSON
      // The CLI JSON response always has "content" as the first key
      // Find the line that contains '{"content"' or '{ "content"' to locate JSON start
      const lines = stdout.split("\n");
      let jsonStartIndex = -1;

      // Find the line that starts the JSON response object
      // Look for pattern: line is "{" and next non-empty line has "content"
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine === "{") {
          // Check if next non-empty line contains "content"
          for (let j = i + 1; j < lines.length && j < i + 3; j++) {
            const nextLine = lines[j].trim();
            if (nextLine.includes('"content"')) {
              jsonStartIndex = i;
              break;
            }
          }
          if (jsonStartIndex !== -1) {
            break;
          }
        }
      }

      core.debug(`JSON start line index: ${jsonStartIndex}`);

      if (jsonStartIndex === -1) {
        core.debug("No JSON found, returning raw stdout");
        return {
          success: true,
          response: stdout.trim(),
          executionTime,
        };
      }

      // Extract JSON from that line onwards
      const jsonStr = lines.slice(jsonStartIndex).join("\n").trim();
      core.debug(`JSON string starts with: ${jsonStr.substring(0, 50)}`);

      const cliResponse = JSON.parse(jsonStr) as CliResponse;
      core.debug(
        `Parsed CLI response keys: ${Object.keys(cliResponse).join(", ")}`,
      );
      core.debug(
        `cliResponse.content: ${cliResponse.content?.substring(0, 50)}`,
      );
      core.debug(`cliResponse.provider: ${cliResponse.provider}`);
      const transformed = transformCliResponse(cliResponse);
      core.debug(
        `Transformed response: ${transformed.response?.substring(0, 50)}`,
      );
      core.debug(`Transformed provider: ${transformed.provider}`);

      return {
        success: true,
        ...transformed,
        executionTime: transformed.executionTime || executionTime,
      };
    } catch (parseError) {
      // If not JSON, return raw output
      core.debug(
        `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      return {
        success: true,
        response: stdout.trim(),
        executionTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      response: "",
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Run complete NeuroLink action
 */
export async function runNeurolink(
  inputs: ActionInputs,
): Promise<ActionExecutionResult> {
  // Install CLI
  await installNeurolink(inputs.neurolinkVersion);

  // Build environment
  const env = buildEnvironmentVariables(inputs);

  // Handle Google Cloud credentials (base64 decode)
  if (inputs.googleCloudConfig.googleApplicationCredentials) {
    const decoded = Buffer.from(
      inputs.googleCloudConfig.googleApplicationCredentials,
      "base64",
    ).toString("utf-8");
    const credPath = path.join(
      process.env.RUNNER_TEMP || "/tmp",
      "vertex-credentials.json",
    );
    fs.writeFileSync(credPath, decoded);
    env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }

  // Build CLI arguments
  const args = buildCliArgs(inputs);

  core.info(`Executing: neurolink ${args.join(" ")}`);
  if (inputs.debug) {
    core.debug(`Working directory: ${inputs.workingDirectory}`);
    core.debug(
      `Environment keys: ${Object.keys(env)
        .filter((k) => k.includes("API") || k.includes("KEY"))
        .join(", ")}`,
    );
  }

  // Execute
  return executeNeurolink(args, env, inputs.workingDirectory);
}
