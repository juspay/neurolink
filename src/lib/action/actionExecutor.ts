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
} from "../types/index.js";
import { buildEnvironmentVariables } from "./actionInputs.js";
import { EXACT_VERSION_PATTERN } from "./cliVersion.js";
import { withTimeout } from "../utils/errorHandling.js";

/** Default timeout for CLI execution (5 minutes) */
const DEFAULT_EXECUTION_TIMEOUT_MS = 300000;

/** The package the action installs and runs. */
const CLI_PACKAGE = "@juspay/neurolink";

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
    responseJson: cliResponse,
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
 * Install the NeuroLink CLI into a private directory under RUNNER_TEMP and
 * return the path of its `neurolink` executable.
 *
 * Three things changed from the original `npm install -g @juspay/neurolink`:
 *
 * - The version is exact unless the consumer opts into `latest`. The action
 *   runs with the consumer's provider keys in its environment, so a moving tag
 *   would hand one bad npm publish to every consumer within minutes; pinning
 *   the action itself by SHA cannot protect against that, only pinning what it
 *   installs can. `latest` still works, with a warning that names the trade.
 * - `--ignore-scripts`: no lifecycle script of any package in the tree runs on
 *   the consumer's runner. NeuroLink has none of its own, and the packages
 *   whose scripts matter (ffmpeg-static's binary download, sharp's prebuilt
 *   lookup) are optional dependencies the action's text generation path does
 *   not use. Video inputs need an ffmpeg on the runner's PATH, which GitHub's
 *   Ubuntu images provide.
 * - `npm audit signatures` after the install: every package in the tree must
 *   carry a valid registry signature, and the ones published with provenance
 *   (this package is) must carry an attestation that matches. A tarball that
 *   was swapped or re-signed fails here instead of running.
 *
 * A project directory rather than `-g` because `npm audit signatures` reads a
 * project's lockfile, and because it keeps the install out of the runner's
 * global prefix, where a later step could find a stale copy.
 */
export async function installNeurolink(
  version: string,
  installRoot: string = process.env.RUNNER_TEMP || "/tmp",
): Promise<string> {
  const spec = resolveInstallSpec(version);
  const installDir = path.join(
    installRoot,
    `neurolink-cli-${process.pid}-${Date.now()}`,
  );
  fs.mkdirSync(installDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(installDir, "package.json"),
    JSON.stringify({ name: "neurolink-action-cli", private: true }, null, 2),
    { mode: 0o600 },
  );

  core.info(`Installing ${spec}...`);
  const npmOptions = { cwd: installDir, silent: !core.isDebug() };
  await exec.exec(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-fund",
      "--no-audit",
      "--save-exact",
      spec,
    ],
    npmOptions,
  );

  core.info("Verifying registry signatures and provenance attestations...");
  await exec.exec("npm", ["audit", "signatures"], npmOptions);

  const binPath = path.join(installDir, "node_modules", ".bin", "neurolink");
  if (!fs.existsSync(binPath)) {
    throw new Error(
      `${spec} installed but exposes no neurolink executable at ${binPath}`,
    );
  }
  core.info(`NeuroLink CLI ${version} installed at ${installDir}`);
  return binPath;
}

/**
 * The exact `npm install` spec for a `neurolink_version` input. Anything that
 * is neither `latest` nor an exact `x.y.z` is refused: a range or a dist-tag
 * would quietly reintroduce the moving target the pin exists to remove.
 */
export function resolveInstallSpec(version: string): string {
  if (version === "latest") {
    core.warning(
      `neurolink_version is "latest": the action will install whatever ${CLI_PACKAGE} version the registry serves at run time. Pin an exact version (the default) for a reproducible, review-gated install.`,
    );
    return `${CLI_PACKAGE}@latest`;
  }
  if (!EXACT_VERSION_PATTERN.test(version)) {
    throw new Error(
      `neurolink_version must be an exact version such as 13.8.16, or the literal "latest"; received "${version}"`,
    );
  }
  return `${CLI_PACKAGE}@${version}`;
}

/**
 * Execute NeuroLink CLI command
 * @param args - CLI arguments
 * @param env - Environment variables
 * @param workingDirectory - Working directory for execution
 * @param timeout - Timeout in milliseconds (defaults to 5 minutes)
 * @param cliPath - The executable to run; defaults to `neurolink` on PATH
 */
export async function executeNeurolink(
  args: string[],
  env: Record<string, string>,
  workingDirectory?: string,
  timeout: number = DEFAULT_EXECUTION_TIMEOUT_MS,
  cliPath: string = "neurolink",
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

    const execPromise = exec.getExecOutput(cliPath, args, {
      cwd: workingDirectory,
      env: { ...processEnv, ...env },
      silent: false,
      ignoreReturnCode: true,
    });

    // Wrap execution with timeout protection
    const { exitCode, stdout, stderr } = await withTimeout(
      execPromise,
      timeout,
      new Error(
        `CLI execution timed out after ${timeout}ms. Consider increasing the timeout parameter.`,
      ),
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
  let credPath: string | undefined;

  try {
    // Install CLI (exact version unless `latest` was requested)
    const cliPath = await installNeurolink(inputs.neurolinkVersion);

    // Build environment
    const env = buildEnvironmentVariables(inputs);

    // Handle Google Cloud credentials (base64 decode)
    if (inputs.googleCloudConfig.googleApplicationCredentials) {
      const decoded = Buffer.from(
        inputs.googleCloudConfig.googleApplicationCredentials,
        "base64",
      ).toString("utf-8");
      credPath = path.join(
        process.env.RUNNER_TEMP || "/tmp",
        `vertex-credentials-${process.pid}-${Date.now()}.json`,
      );
      fs.writeFileSync(credPath, decoded, { mode: 0o600 });
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

    // Execute with timeout (use input timeout or default)
    const executionTimeout = inputs.timeout || DEFAULT_EXECUTION_TIMEOUT_MS;
    return await executeNeurolink(
      args,
      env,
      inputs.workingDirectory,
      executionTimeout,
      cliPath,
    );
  } finally {
    // Clean up credential file
    if (credPath && fs.existsSync(credPath)) {
      try {
        fs.unlinkSync(credPath);
        core.debug("Cleaned up temporary credentials file");
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
