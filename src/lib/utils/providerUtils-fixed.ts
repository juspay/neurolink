import { AIProviderFactory } from "../core/factory.js";
import { logger } from "./logger.js";
import { hasProviderEnvVars } from "./providerUtils.js";

/**
 * Asynchronously get the best available provider based on real-time checks.
 * This function performs actual authentication and availability tests.
 *
 * @param requestedProvider - Optional preferred provider name
 * @returns The best provider name to use
 */
export async function getBestProvider(
  requestedProvider?: string,
): Promise<string> {
  // 🔧 FIX: Check for explicit default provider in env
  if (
    process.env.DEFAULT_PROVIDER &&
    (await isProviderAvailable(process.env.DEFAULT_PROVIDER))
  ) {
    logger.debug(
      `[getBestProvider] Using DEFAULT_PROVIDER: ${process.env.DEFAULT_PROVIDER}`,
    );
    return process.env.DEFAULT_PROVIDER;
  }

  // 🔧 FIX: Special case for Ollama when explicitly configured
  if (process.env.OLLAMA_BASE_URL && process.env.OLLAMA_MODEL) {
    // Quick connectivity check for Ollama
    try {
      if (await isProviderAvailable("ollama")) {
        logger.debug(`[getBestProvider] Prioritizing working local Ollama`);
        return "ollama"; // Prioritize working local AI
      }
    } catch {
      // Fall through to cloud providers
    }
  }

  const providers = [
    "google-ai",
    "anthropic",
    "openai",
    "mistral",
    "vertex",
    "azure",
    "huggingface",
    "bedrock",
    "ollama", // Keep as fallback
  ];

  if (requestedProvider && requestedProvider !== "auto") {
    if (await isProviderAvailable(requestedProvider)) {
      logger.debug(
        `[getBestProvider] Using requested provider: ${requestedProvider}`,
      );
      return requestedProvider;
    } else {
      logger.warn(
        `[getBestProvider] Requested provider '${requestedProvider}' is not available. Falling back to auto-selection.`,
      );
    }
  }

  for (const provider of providers) {
    if (await isProviderAvailable(provider)) {
      logger.debug(`[getBestProvider] Selected provider: ${provider}`);
      return provider;
    }
  }

  throw new Error(
    "No available AI providers. Please check your configurations.",
  );
}

/**
 * Check if a provider is truly available by performing a quick authentication test.
 *
 * @param providerName - The name of the provider to check.
 * @returns True if the provider is available and authenticated.
 */
async function isProviderAvailable(providerName: string): Promise<boolean> {
  if (!hasProviderEnvVars(providerName) && providerName !== "ollama") {
    return false;
  }

  if (providerName === "ollama") {
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        const { models } = await response.json();
        const defaultOllamaModel = "llama3.2:latest";
        return models.some((m: any) => m.name === defaultOllamaModel);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  try {
    const provider = await AIProviderFactory.createProvider(providerName);
    await provider.generateText({ prompt: "test", maxTokens: 1 });
    return true;
  } catch (error) {
    return false;
  }
}
