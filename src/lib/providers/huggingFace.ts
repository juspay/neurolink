import type { AIProviderName } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { NeurolinkCredentials, UnknownRecord } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  createHuggingFaceConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const HUGGINGFACE_DEFAULT_BASE_URL = "https://router.huggingface.co/v1";

const getHuggingFaceApiKey = (): string =>
  validateApiKey(createHuggingFaceConfig());

const getDefaultHuggingFaceModel = (): string =>
  getProviderModel("HUGGINGFACE_MODEL", "microsoft/DialoGPT-medium");

/**
 * HuggingFace Provider — direct HTTP, no AI SDK.
 *
 * OpenAI-compatible chat completions at router.huggingface.co/v1 (unified
 * router endpoint, 2025). Supports the full HuggingFace model hub including
 * Llama 3.x, Qwen 2.5, Mistral, DeepSeek, and tool-calling capable variants.
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://huggingface.co/docs/api-inference/index
 */
export class HuggingFaceProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    credentials?: NeurolinkCredentials["huggingFace"],
  ) {
    const apiKey = credentials?.apiKey?.trim()
      ? credentials.apiKey.trim()
      : getHuggingFaceApiKey();
    // Treat blank/whitespace overrides as unset so an empty
    // `credentials.baseURL` or `HUGGINGFACE_BASE_URL=` cannot override the
    // default with "" (mirrors the apiKey precedence above).
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.HUGGINGFACE_BASE_URL?.trim() ||
      HUGGINGFACE_DEFAULT_BASE_URL;

    super("huggingface" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("HuggingFaceProvider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "huggingface" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultHuggingFaceModel();
  }

  protected getFallbackModelName(): string {
    return "meta-llama/Llama-3.1-8B-Instruct";
  }

  /**
   * HuggingFace serves a huge variety of models, many of which reject the
   * OpenAI `tools` field. The base reports supportsTools() === true
   * unconditionally, which would merge tools into requests for models
   * (including the default DialoGPT-medium) that don't accept them. Preserve
   * the pre-migration allowlist: only known tool-calling-capable model
   * families opt in; everything else runs tool-free.
   */
  public supportsTools(): boolean {
    const modelName = this.modelName.toLowerCase();
    const toolCapableModels = [
      "llama-3.1-8b-instruct",
      "llama-3.1-70b-instruct",
      "llama-3.1-405b-instruct",
      "llama-3.1-nemotron-ultra",
      "hermes-3-llama-3.2",
      "hermes-2-pro",
      "codellama-34b-instruct",
      "codellama-13b-instruct",
      "mistral-7b-instruct-v0.3",
      "mistral-8x7b-instruct",
      "nous-hermes",
      "openchat",
      "wizardcoder",
    ];
    return toolCapableModels.some((capable) => modelName.includes(capable));
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "huggingface",
      );
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";

    // Enhanced error messages with tool calling context
    if (
      message.includes("API_TOKEN_INVALID") ||
      message.includes("Invalid token")
    ) {
      return new AuthenticationError(
        "Invalid HuggingFace API token. Please check your HUGGINGFACE_API_KEY environment variable.",
        "huggingface",
      );
    }

    if (message.includes("rate limit")) {
      return new RateLimitError(
        "HuggingFace rate limit exceeded. Consider using a paid plan or try again later.",
        "huggingface",
      );
    }

    if (message.includes("model") && message.includes("not found")) {
      return new InvalidModelError(
        `HuggingFace model '${this.modelName}' not found.\n\nSuggestions:\n1. Check model name spelling\n2. Ensure model exists on HuggingFace Hub\n3. For tool calling, use: Llama-3.1-8B-Instruct, Hermes-3-Llama-3.2-3B, or CodeLlama-34b-Instruct-hf`,
        "huggingface",
      );
    }

    if (message.includes("function") || message.includes("tool")) {
      return new ProviderError(
        `HuggingFace tool calling error: ${message}\n\nNotes:\n1. Ensure you're using a tool-capable model (Llama-3.1+, Hermes-3+, CodeLlama)\n2. Check that your model supports function calling\n3. Verify tool schema format is correct`,
        "huggingface",
      );
    }

    return new ProviderError(
      `HuggingFace Provider Error: ${message}`,
      "huggingface",
    );
  }
}
