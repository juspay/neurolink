/**
 * Model-specific prompt configurations and enhancement utilities
 */

import { isGemini3Model, isGemini25Model } from "../utils/modelDetection.js";

// Re-export from modelDetection for backwards compatibility
export { isGemini3Model, isGemini25Model };

export const MODEL_SPECIFIC_INSTRUCTIONS: Record<string, string> = {
  "gemini-3": `You have access to extended thinking capabilities. Use them for complex reasoning tasks that require deep analysis.`,

  "gemini-2.5": `You support function calling and structured outputs. Format responses according to the requested schema when provided.`,

  "gpt-4": `You are a helpful assistant with strong reasoning capabilities.`,

  "claude-3": `You have extended thinking capabilities available when enabled. Use systematic reasoning for complex problems.`,

  default: "",
};

export function getModelSpecificInstructions(model: string): string {
  if (isGemini3Model(model)) {
    return MODEL_SPECIFIC_INSTRUCTIONS["gemini-3"];
  }
  if (isGemini25Model(model)) {
    return MODEL_SPECIFIC_INSTRUCTIONS["gemini-2.5"];
  }
  if (/^gpt-4/i.test(model)) {
    return MODEL_SPECIFIC_INSTRUCTIONS["gpt-4"];
  }
  if (/^claude-3/i.test(model)) {
    return MODEL_SPECIFIC_INSTRUCTIONS["claude-3"];
  }
  return MODEL_SPECIFIC_INSTRUCTIONS["default"];
}

export function enhancePromptForModel(
  basePrompt: string,
  model: string,
  _provider?: string,
): string {
  const modelInstructions = getModelSpecificInstructions(model);
  if (!modelInstructions) {
    return basePrompt;
  }
  return `${modelInstructions}\n\n${basePrompt}`;
}

export function shouldEnhancePrompt(model: string): boolean {
  return isGemini3Model(model) || isGemini25Model(model);
}
