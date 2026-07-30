import {
  createOpenAIConfig,
  getProviderModel,
  validateApiKey,
} from "../../utils/providerConfig.js";

export const getOpenAIApiKey = (): string => {
  return validateApiKey(createOpenAIConfig());
};

export const getOpenAIModel = (): string => {
  return getProviderModel("OPENAI_MODEL", "gpt-4o");
};
