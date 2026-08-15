import { OpenRouterModels } from "../../constants/enums.js";
import { getProviderModel } from "../../utils/providerConfig.js";

export const getDefaultOpenRouterModel = (): string => {
  return getProviderModel(
    "OPENROUTER_MODEL",
    OpenRouterModels.CLAUDE_SONNET_4_5,
  );
};
