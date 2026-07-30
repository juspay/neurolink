import type { OpenRouterConfig } from "../../types/index.js";
import { OpenRouterModels } from "../../constants/enums.js";
import { getProviderModel } from "../../utils/providerConfig.js";

export const getOpenRouterConfig = (): OpenRouterConfig => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required. " +
        "Get your API key at https://openrouter.ai/keys",
    );
  }

  return {
    apiKey,
    referer: process.env.OPENROUTER_REFERER,
    appName: process.env.OPENROUTER_APP_NAME,
  };
};

export const getDefaultOpenRouterModel = (): string => {
  return getProviderModel(
    "OPENROUTER_MODEL",
    OpenRouterModels.CLAUDE_SONNET_4_5,
  );
};
