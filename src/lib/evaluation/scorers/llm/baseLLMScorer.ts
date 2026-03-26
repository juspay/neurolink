/**
 * @file Base class for all LLM-based scorers
 * Provides common functionality for calling LLMs and parsing responses
 */

import { ProviderFactory } from "../../../factories/providerFactory.js";
import { ProviderRegistry } from "../../../factories/providerRegistry.js";
import type { JsonObject } from "../../../types/common.js";
import type { AIProvider } from "../../../types/providers.js";
import type {
  LLMScorer,
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
} from "../../../types/scorerTypes.js";
import { logger } from "../../../utils/logger.js";
import { BaseScorer } from "../baseScorer.js";

/**
 * Default LLM scorer configuration
 */
export const DEFAULT_LLM_SCORER_CONFIG: LLMScorerConfig = {
  enabled: true,
  threshold: 0.7,
  weight: 1.0,
  timeout: 30000,
  retries: 2,
  temperature: 0.1,
};

/**
 * Abstract base class for LLM-based scorers
 */
export abstract class BaseLLMScorer extends BaseScorer implements LLMScorer {
  protected _llmConfig: LLMScorerConfig;
  protected provider?: AIProvider;
  private initializationPromise: Promise<void> | null = null;

  constructor(metadata: ScorerMetadata, config?: LLMScorerConfig) {
    super(metadata, config);
    this._llmConfig = {
      ...DEFAULT_LLM_SCORER_CONFIG,
      ...metadata.defaultConfig,
      ...config,
    };
  }

  /**
   * Get LLM-specific configuration
   */
  get llmConfig(): LLMScorerConfig {
    return this._llmConfig;
  }

  /**
   * Generate the prompt for LLM scoring - must be implemented by subclasses
   */
  abstract generatePrompt(input: ScorerInput): string;

  /**
   * Parse LLM response into score result - must be implemented by subclasses
   */
  abstract parseResponse(
    response: string,
    input: ScorerInput,
  ): Partial<ScoreResult>;

  /**
   * Main scoring method
   */
  async score(input: ScorerInput): Promise<ScoreResult> {
    return this.executeWithTiming(async () => {
      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return this.createErrorResult(
          `Invalid input: ${validation.errors.join(", ")}`,
        );
      }

      try {
        // Initialize provider if needed
        await this.initializeProvider();

        // Generate prompt
        const prompt = this.generatePrompt(input);

        // Call LLM with retry logic
        const response = await this.executeWithRetry(
          () => this.callLLM(prompt),
          this._llmConfig.retries,
        );

        // Parse response
        const parsedResult = this.parseResponse(response, input);

        // Create score result
        const score = parsedResult.score ?? 0;
        return this.createScoreResult(score, parsedResult.reasoning ?? "", {
          confidence: parsedResult.confidence,
          metadata: parsedResult.metadata,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`LLM scorer ${this._metadata.id} failed`, {
          error: errorMessage,
        });
        return this.createErrorResult(errorMessage);
      }
    });
  }

  /**
   * Initialize the AI provider
   */
  protected async initializeProvider(): Promise<void> {
    if (this.provider) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitializeProvider();
    return this.initializationPromise;
  }

  /**
   * Internal method to actually initialize the provider
   */
  private async _doInitializeProvider(): Promise<void> {
    try {
      // Ensure providers are registered
      await ProviderRegistry.registerAllProviders();

      // Get provider and model from config or environment
      const providerName =
        this._llmConfig.provider ??
        process.env.NEUROLINK_EVALUATION_PROVIDER ??
        "vertex";
      const modelName =
        this._llmConfig.model ?? process.env.NEUROLINK_EVALUATION_MODEL;

      this.provider = await ProviderFactory.createProvider(
        providerName,
        modelName,
      );

      logger.debug(`Initialized provider for scorer ${this._metadata.id}`, {
        provider: providerName,
        model: modelName,
      });
    } catch (error) {
      // Reset promise on failure so initialization can be retried
      this.initializationPromise = null;
      logger.error(
        `Failed to initialize provider for scorer ${this._metadata.id}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Call the LLM with the given prompt
   */
  protected async callLLM(prompt: string): Promise<string> {
    const provider = this.provider;
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    const timeout = this._llmConfig.timeout ?? 30000;

    const result = (await this.executeWithTimeout(
      () =>
        provider.generate({
          prompt,
          temperature: this._llmConfig.temperature ?? 0.1,
          maxTokens: 2000,
        }),
      timeout,
      `${this.metadata.id}-llm-call`,
    )) as { content?: string };

    if (!result) {
      throw new Error("Provider returned no result");
    }

    return result.content ?? "";
  }

  /**
   * Extract JSON from LLM response
   * Handles various formats including markdown code blocks
   */
  protected extractJSON(response: string): JsonObject | null {
    try {
      // Linear fence scanning instead of regex (avoids ReDoS)
      const fenceStart = response.indexOf("```");
      let jsonStr: string | null = null;
      if (fenceStart !== -1) {
        const contentStart = response.indexOf("\n", fenceStart);
        if (contentStart !== -1) {
          const fenceEnd = response.indexOf("```", contentStart);
          if (fenceEnd !== -1) {
            jsonStr = response.substring(contentStart + 1, fenceEnd).trim();
          }
        }
      }

      if (!jsonStr) {
        // Linear brace-balancing scan (avoids ReDoS)
        const firstBrace = response.indexOf("{");
        if (firstBrace !== -1) {
          let depth = 0;
          for (let i = firstBrace; i < response.length; i++) {
            if (response[i] === "{") {
              depth++;
            } else if (response[i] === "}") {
              depth--;
            }
            if (depth === 0) {
              jsonStr = response.substring(firstBrace, i + 1);
              break;
            }
          }
        }
      }

      if (jsonStr) {
        return JSON.parse(jsonStr);
      }

      // Try parsing the entire response
      return JSON.parse(response.trim());
    } catch (error) {
      logger.debug(`[${this.metadata.id}] Failed to parse JSON`, {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: response.substring(0, 100).replace(/[\n\r]/g, " "),
      });
      return null;
    }
  }

  /**
   * Simple template substitution for prompts
   */
  protected substituteTemplate(
    template: string,
    variables: Record<string, string | string[] | undefined>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      if (value === undefined) {
        continue;
      }

      const placeholder = `{{${key}}}`;
      const arrayPlaceholder = new RegExp(
        `\\{\\{#each ${key}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`,
        "g",
      );

      if (Array.isArray(value)) {
        // Handle array iteration
        result = result.replace(arrayPlaceholder, (_, content) => {
          return value
            .map((item, index) => {
              let itemContent = content;
              itemContent = itemContent.replace(/\{\{this\}\}/g, item);
              itemContent = itemContent.replace(
                /\{\{@index\}\}/g,
                String(index),
              );
              return itemContent.trim();
            })
            .join("\n");
        });
      } else {
        result = result.replace(new RegExp(placeholder, "g"), value);
      }
    }

    // Linear scan to remove unresolved conditionals
    let idx = 0;
    while ((idx = result.indexOf("{{#if ", idx)) !== -1) {
      const endTag = result.indexOf("{{/if}}", idx);
      if (endTag !== -1) {
        result = result.substring(0, idx) + result.substring(endTag + 7);
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Handle conditional template blocks
   */
  protected processConditionals(
    template: string,
    conditions: Record<string, boolean>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(conditions)) {
      const conditionalRegex = new RegExp(
        `\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`,
        "g",
      );

      if (value) {
        result = result.replace(conditionalRegex, "$1");
      } else {
        result = result.replace(conditionalRegex, "");
      }
    }

    return result;
  }

  /**
   * Extract a numeric score from text response
   * Safe numeric extraction without ReDoS-prone regex
   */
  protected extractNumericScore(text: string): number | null {
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0 && num <= 10) {
        return num;
      }
      // Try "score: N" pattern
      const colonIdx = trimmed.toLowerCase().indexOf("score");
      if (colonIdx !== -1) {
        const afterScore = trimmed
          .substring(colonIdx + 5)
          .replace(/[^0-9.]/g, " ")
          .trim();
        const scoreNum = parseFloat(afterScore.split(/\s+/)[0]);
        if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10) {
          return scoreNum;
        }
      }
    }
    return null;
  }

  /**
   * Extract a numeric score from text response with fallback
   */
  protected extractScoreFromText(text: string, min = 0, max = 10): number {
    const score = this.extractNumericScore(text);
    if (score !== null && score >= min && score <= max) {
      return score;
    }
    // Default to middle score if nothing found
    return (min + max) / 2;
  }
}
