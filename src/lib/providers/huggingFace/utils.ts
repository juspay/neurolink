import {
  createHuggingFaceConfig,
  getProviderModel,
  validateApiKey,
} from "../../utils/providerConfig.js";

export const getHuggingFaceApiKey = (): string => {
  return validateApiKey(createHuggingFaceConfig());
};

export const getDefaultHuggingFaceModel = (): string => {
  return getProviderModel("HUGGINGFACE_MODEL", "microsoft/DialoGPT-medium");
};
