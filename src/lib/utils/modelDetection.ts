/**
 * Model detection utilities for capability checking
 */

/**
 * Check if model name is valid for detection functions
 */
function isValidModelName(modelName: unknown): modelName is string {
  return typeof modelName === "string" && modelName.length > 0;
}

export function isGemini3Model(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return /^gemini-3(-.*)?$/i.test(modelName);
}

export function isGemini25Model(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return /^gemini-2\.5(-.*)?$/i.test(modelName);
}

export function supportsThinkingConfig(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  const thinkingModels = [
    /^gemini-3/i,
    /^gemini-2\.5-pro/i,
    /^gemini-2\.5-flash/i,
  ];
  return thinkingModels.some((pattern) => pattern.test(modelName));
}

export function supportsPromptCaching(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  const cachingModels = [
    /^gemini-3/i,
    /^gemini-2\.5/i,
    /^gpt-4/i,
    /^claude-3/i,
  ];
  return cachingModels.some((pattern) => pattern.test(modelName));
}

export function getMaxThinkingBudgetTokens(modelName: string): number {
  if (!isValidModelName(modelName)) {
    return 10000;
  }
  if (/^gemini-3-pro/i.test(modelName)) {
    return 100000;
  }
  if (/^gemini-3-flash/i.test(modelName)) {
    return 50000;
  }
  if (/^gemini-2\.5/i.test(modelName)) {
    return 32000;
  }
  return 10000;
}

export function getModelFamily(modelName: string): string {
  if (!isValidModelName(modelName)) {
    return "unknown";
  }
  if (/^gemini-3/i.test(modelName)) {
    return "gemini-3";
  }
  if (/^gemini-2\.5/i.test(modelName)) {
    return "gemini-2.5";
  }
  if (/^gemini-2/i.test(modelName)) {
    return "gemini-2";
  }
  if (/^gpt-4/i.test(modelName)) {
    return "gpt-4";
  }
  if (/^claude-3/i.test(modelName)) {
    return "claude-3";
  }
  return "unknown";
}
