// src/action/index.ts
/**
 * GitHub Action entry point
 */

import * as core from "@actions/core";
import {
  parseActionInputs,
  validateActionInputs,
  maskSecrets,
  runNeurolink,
  postResultComment,
  writeJobSummary,
  setActionOutputs,
} from "../lib/action/index.js";

async function run(): Promise<void> {
  try {
    core.info("NeuroLink GitHub Action starting...");

    // Parse inputs
    const inputs = parseActionInputs();

    // Mask secrets in logs
    maskSecrets(inputs);

    core.info(`Command: ${inputs.command}`);
    core.info(`Provider: ${inputs.provider}`);
    if (inputs.model) {
      core.info(`Model: ${inputs.model}`);
    }

    // Validate inputs
    const validation = validateActionInputs(inputs);
    for (const warning of validation.warnings) {
      core.warning(warning);
    }
    if (!validation.valid) {
      core.setFailed(
        `Input validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    // Execute NeuroLink CLI
    const result = await runNeurolink(inputs);

    if (!result.success) {
      core.setOutput("error", result.error);
      core.setFailed(`NeuroLink execution failed: ${result.error}`);
      return;
    }

    core.info("NeuroLink execution successful");

    // Post comment if enabled
    const commentResult = await postResultComment(inputs, result);

    // Write job summary
    await writeJobSummary(inputs, result);

    // Set outputs
    setActionOutputs(result, commentResult);

    // Log summary
    core.info(`Response length: ${result.response.length} characters`);
    if (result.usage?.totalTokens) {
      core.info(`Tokens used: ${result.usage.totalTokens}`);
    }
    if (result.cost) {
      core.info(`Cost: $${result.cost.toFixed(6)}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setOutput("error", message);
    core.setFailed(message);
  }
}

run();
