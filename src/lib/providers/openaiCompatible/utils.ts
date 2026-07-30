export const getOpenAICompatibleConfig = () => {
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

  if (!baseURL) {
    throw new Error(
      "OPENAI_COMPATIBLE_BASE_URL environment variable is required. " +
        "Please set it to your OpenAI-compatible endpoint (e.g., https://api.openrouter.ai/api/v1)",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_COMPATIBLE_API_KEY environment variable is required. " +
        "Please set it to your API key for the OpenAI-compatible service.",
    );
  }

  return { baseURL, apiKey };
};

export const getDefaultOpenAICompatibleModel = (): string | undefined => {
  return process.env.OPENAI_COMPATIBLE_MODEL || undefined;
};
