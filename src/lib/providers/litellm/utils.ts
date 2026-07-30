import { getProviderModel } from "../../utils/providerConfig.js";

export const getLiteLLMConfig = (): { baseURL: string; apiKey: string } => {
  return {
    baseURL: process.env.LITELLM_BASE_URL || "http://localhost:4000",
    apiKey: process.env.LITELLM_API_KEY || "sk-anything",
  };
};

export const getDefaultLiteLLMModel = (): string => {
  return getProviderModel("LITELLM_MODEL", "openai/gpt-4o-mini");
};
