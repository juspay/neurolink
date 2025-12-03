/**
 * @file Implements the RetryManager class for handling evaluation retries.
 */

import type { EvaluationResult } from "../types/evaluationTypes.js";
import type { TextGenerationOptions } from "../types/generateTypes.js";

/**
 * Manages the retry logic for the auto-evaluation middleware. It decides if a
 * retry is warranted based on the evaluation score and prepares the options
 * for the next generation attempt by incorporating feedback into the prompt.
 */
export class RetryManager {
  private maxRetries: number;

  constructor(maxRetries = 2) {
    // Total 3 attempts: 1 initial + 2 retries
    this.maxRetries = maxRetries;
  }

  /**
   * Determines if a retry should be attempted based on the evaluation result.
   *
   * @param evaluation The `EvaluationResult` of the last attempt.
   * @returns `true` if the response did not pass and the maximum number of retries has not been reached.
   */
  public shouldRetry(evaluation: EvaluationResult): boolean {
    // Attempt number is 1-based. If attempt 1 fails, we can retry.
    // If attempt 3 (maxRetries + 1) fails, we stop.
    return !evaluation.isPassing && evaluation.attemptNumber <= this.maxRetries;
  }

  /**
   * Prepares the options for the next generation attempt by creating a new,
   * improved prompt that includes feedback from the failed evaluation.
   *
   * @param originalOptions The original `TextGenerationOptions` from the user request.
   * @param evaluation The `EvaluationResult` of the failed attempt.
   * @returns A new `TextGenerationOptions` object with an improved prompt.
   */
  public prepareRetryOptions(
    originalOptions: TextGenerationOptions,
    evaluation: EvaluationResult,
  ): TextGenerationOptions {
    const originalPrompt =
      originalOptions.prompt || originalOptions.input?.text || "";

    const newPrompt = this.buildRetryPrompt(
      originalPrompt,
      evaluation.suggestedImprovements,
      evaluation.attemptNumber + 1, // The next attempt number
    );

    // Return a new options object with the updated prompt
    return {
      ...originalOptions,
      prompt: newPrompt,
      // Ensure input is not carried over if prompt is now the source of truth
      input: undefined,
      // Carry over the original prompt for context in subsequent retries if needed
      originalPrompt: originalOptions.originalPrompt || originalPrompt,
    };
  }

  /**
   * Builds a new prompt for a retry attempt by incorporating feedback from the
   * evaluation. The instructions become progressively more direct with each attempt.
   *
   * @param originalPrompt The user's original prompt.
   * @param feedback The constructive feedback from the evaluation.
   * @param attemptNumber The upcoming attempt number (e.g., 2 for the first retry).
   * @returns A new, enhanced prompt string.
   */
  private buildRetryPrompt(
    originalPrompt: string,
    feedback: string,
    attemptNumber: number,
  ): string {
    let instruction = "";
    switch (attemptNumber) {
      case 2: // First retry
        instruction = `The previous response was not satisfactory. Please improve it based on the following feedback: "${feedback}".`;
        break;
      case 3: // Second retry
        instruction = `The last response still requires improvement. Pay close attention to this feedback: "${feedback}". You MUST address these points.`;
        break;
      default: // Final retry or unexpected attempt number
        instruction = `This is the final attempt. You MUST address the following feedback to generate a satisfactory response: "${feedback}".`;
        break;
    }

    return `
    Original Request: ${originalPrompt}

    **Correction Instructions:**
    ${instruction}

    Generate a new, complete response that incorporates this feedback.
  `;
  }
}
