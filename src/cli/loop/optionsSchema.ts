import { AIProviderName } from "../../lib/types/providers.js";
import type { TextGenerationOptions } from "../../lib/types/generateTypes.js";

/**
 * Defines the schema for a session variable or a generation option.
 */
export interface OptionSchema {
  type: "string" | "boolean" | "number";
  description: string;
  allowedValues?: string[];
}

/**
 * Master schema for all text generation options.
 * This object provides metadata for validation and help text in the CLI loop.
 * It is derived from the main TextGenerationOptions interface to ensure consistency.
 */
export const textGenerationOptionsSchema: Record<
  keyof Omit<
    TextGenerationOptions,
    // Exclude non-primitive types and complex objects that aren't set via simple CLI commands
    | "prompt"
    | "input"
    | "schema"
    | "tools"
    | "context"
    | "conversationHistory"
    | "conversationMessages"
    | "conversationMemoryConfig"
    | "originalPrompt"
    | "middleware"
    | "expectedOutcome"
    | "evaluationCriteria"
    | "region"
  >,
  OptionSchema
> = {
  provider: {
    type: "string",
    description: "The AI provider to use.",
    allowedValues: (Object.values(AIProviderName) as unknown[])
      .filter((p): p is string => typeof p === "string")
      .filter((p) => p !== AIProviderName.AUTO),
  },
  model: {
    type: "string",
    description: "The specific model to use from the provider.",
  },
  temperature: {
    type: "number",
    description: "Controls randomness of the output (e.g., 0.2, 0.8).",
  },
  maxTokens: {
    type: "number",
    description: "The maximum number of tokens to generate.",
  },
  systemPrompt: {
    type: "string",
    description: "The system prompt to guide the AI's behavior.",
  },
  timeout: {
    type: "number",
    description: "Timeout for the generation request in milliseconds.",
  },
  disableTools: {
    type: "boolean",
    description: "Disable all tool usage for the AI.",
  },
  maxSteps: {
    type: "number",
    description: "Maximum number of tool execution steps.",
  },
  enableAnalytics: {
    type: "boolean",
    description: "Enable or disable analytics for responses.",
  },
  enableEvaluation: {
    type: "boolean",
    description: "Enable or disable AI-powered evaluation of responses.",
  },
  evaluationDomain: {
    type: "string",
    description:
      'Domain expertise for evaluation (e.g., "general AI assistant").',
  },
  toolUsageContext: {
    type: "string",
    description: "Context about tools/MCPs used in the interaction.",
  },
};
