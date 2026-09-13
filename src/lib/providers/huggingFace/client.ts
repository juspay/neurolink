import { HuggingFaceModels } from "../../constants/enums.js";
import type { AIProviderName } from "../../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../../types/index.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
} from "../../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../../utils/errorClassifier.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import {
  createHuggingFaceConfig,
  getProviderModel,
  validateApiKey,
} from "../../utils/providerConfig.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";

const HUGGINGFACE_DEFAULT_BASE_URL = "https://router.huggingface.co/v1";

const getHuggingFaceApiKey = (): string =>
  validateApiKey(createHuggingFaceConfig());

/**
 * Must stay the same id `providerRegistry` passes as the registration default
 * (`process.env.HUGGINGFACE_MODEL || HuggingFaceModels.QWEN_2_5_72B_INSTRUCT`),
 * hence the shared constant rather than a second literal.
 *
 * The registry supplies `modelName` on every factory-created provider, so this
 * only decides a directly-constructed `new HuggingFaceProvider()`. It still
 * matters: it previously read `microsoft/DialoGPT-medium`, which the router
 * does not serve under any request shape — it answers 400 "not supported by
 * any provider you have enabled" with or without `tools` — and that stale id
 * was what the docs and setup guidance advertised as the default.
 */
const getDefaultHuggingFaceModel = (): string =>
  getProviderModel(
    "HUGGINGFACE_MODEL",
    HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
  );

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
    _region?: string,
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
   * Tool support is resolved by the base through MODEL_REGISTRY's
   * `modelSupports()` facade, which defaults unknown models to supported.
   *
   * This class used to override that with a 13-entry allowlist of model-name
   * substrings, written for the old per-model Inference API where many
   * endpoints rejected the OpenAI `tools` field. The router replaced that, and
   * the list did not keep up. Measured against the 142 models
   * `GET router.huggingface.co/v1/models` served on 2026-09-13 (the
   * catalogue drifts, so treat the totals as a snapshot; the ratio is the
   * point):
   *
   *   allowlist entries matching ANY served model   1 of 13
   *   served models the allowlist ADMITS            1 of 142
   *   served models the allowlist BLOCKS          141
   *
   * So it suppressed tool calling for 99% of the catalogue, including
   * Qwen/Qwen2.5-72B-Instruct, which the router demonstrably tool-calls. A
   * spread of the blocked models — GLM-5.3-Flash, gemma-4-31B-it,
   * DeepSeek-V4-Flash — all accept `tools` with HTTP 200 and return
   * `tool_calls`; none rejected the field.
   *
   * The allowlist's own comment named `microsoft/DialoGPT-medium` — which
   * `getDefaultModel()`, not `getFallbackModelName()`, used to return — as a
   * model that rejects `tools`. The router does not serve it under any
   * request shape, so that path was never reachable; the default now points
   * at a served model (see `getDefaultHuggingFaceModel`).
   *
   * A model that genuinely cannot use tools simply does not emit `tool_calls`,
   * which the loop already handles, so the optimistic default costs nothing
   * that the allowlist was protecting.
   */

  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /API_TOKEN_INVALID|Invalid token/.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid HuggingFace API token. Please check your HUGGINGFACE_API_KEY environment variable.",
      },
      {
        match: (ctx) => /rate limit/.test(ctx.message),
        errorClass: RateLimitError,
        message:
          "HuggingFace rate limit exceeded. Consider using a paid plan or try again later.",
      },
      {
        match: (ctx) =>
          /model/.test(ctx.message) && /not found/.test(ctx.message),
        errorClass: InvalidModelError,
        message: () =>
          `HuggingFace model '${this.modelName}' not found.\n\nSuggestions:\n1. Check model name spelling\n2. Ensure model exists on HuggingFace Hub\n3. For tool calling, use: Llama-3.1-8B-Instruct, Hermes-3-Llama-3.2-3B, or CodeLlama-34b-Instruct-hf`,
      },
      {
        match: (ctx) => /function|tool/.test(ctx.message),
        errorClass: ProviderError,
        message: (ctx) =>
          `HuggingFace tool calling error: ${ctx.message}\n\nNotes:\n1. Ensure you're using a tool-capable model (Llama-3.1+, Hermes-3+, CodeLlama)\n2. Check that your model supports function calling\n3. Verify tool schema format is correct`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(
      error,
      rules,
      this.providerName,
      this.modelName,
    );
  }
}
