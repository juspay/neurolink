import type { AIProviderName } from "../constants/enums.js";
import {
  ErrorCategory,
  ErrorSeverity,
  ReplicateModels,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { getReplicateAuth } from "../adapters/replicate/auth.js";
import {
  downloadPredictionOutput,
  predict,
} from "../adapters/replicate/predictionLifecycle.js";
import { MAX_IMAGE_BYTES } from "../utils/sizeGuard.js";
import { isNeuroLink } from "../neurolink.js";
import type {
  EnhancedGenerateResult,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  TextGenerationOptions,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import {
  createReplicateConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import type { LanguageModel } from "../types/index.js";

const getDefaultReplicateModel = (): string =>
  getProviderModel("REPLICATE_MODEL", ReplicateModels.LLAMA_3_70B_INSTRUCT);

/**
 * Render a chat-style options object as a single prompt string suitable
 * for Replicate's prediction API. Replicate-hosted Llama / Mistral models
 * expect a flat `prompt` (or model-specific `messages`) input — they don't
 * implement OpenAI's chat-completions contract uniformly.
 */
function buildPromptFromOptions(
  options: StreamOptions | TextGenerationOptions,
): string {
  const opts = options as TextGenerationOptions;
  const userText = opts.prompt ?? opts.input?.text ?? "";
  const system = opts.systemPrompt;
  if (system) {
    return `${system}\n\n${userText}`;
  }
  return userText;
}

function flattenReplicateOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  if (Array.isArray(output)) {
    return output
      .map((part) => (typeof part === "string" ? part : ""))
      .join("");
  }
  return "";
}

/**
 * Replicate LLM Provider — predict-then-stream pattern.
 *
 * Replicate's prediction API is asynchronous: POST `/predictions`, poll
 * until `succeeded`, fetch the output. Their streaming endpoint is SSE
 * on a separate URL and not OpenAI-compatible.
 *
 * For a first pass we run the prediction synchronously (with the
 * `Prefer: wait=60` hint baked into `predict()`) and synthesize a single-
 * chunk stream. Future revisions can swap in true SSE streaming when
 * the prediction lifecycle helper grows support for it.
 *
 * For image-gen models on Replicate (FLUX, SDXL, etc.) use Replicate via
 * `output: { mode: "image" }` once the routing layer recognises the
 * `flux` / `sdxl` prefixes (already in IMAGE_GENERATION_MODELS for
 * direct Stability/Ideogram/Recraft; Replicate-hosted FLUX runs through
 * `executeImageGeneration` overridden below when the model id matches).
 *
 * Tool calling is not supported (Replicate predictions are stateless and
 * don't carry function-call metadata reliably).
 *
 * @see https://replicate.com/docs/reference/http
 */
export class ReplicateProvider extends BaseProvider {
  private readonly apiToken: string;
  private readonly baseURL?: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["replicate"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "replicate" as AIProviderName, validatedNeurolink);

    const overrideToken = credentials?.apiToken?.trim();
    this.apiToken =
      overrideToken && overrideToken.length > 0
        ? overrideToken
        : validateApiKey(createReplicateConfig());
    this.baseURL = credentials?.baseUrl;

    logger.debug("Replicate Provider initialized", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultReplicateModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  /**
   * Replicate doesn't expose a chat-completions endpoint we can wrap as
   * an AI SDK `LanguageModel`. This getter is consulted by `streamText`
   * (which we intentionally bypass) and by middleware injection (which
   * also bypasses to executeStream below). Throwing here keeps the
   * contract honest.
   */
  protected getAISDKModel(): LanguageModel {
    throw new Error(
      "Replicate routes through the predictions API, not the AI SDK chat models. Streaming uses the predict-then-stream path inside executeStream.",
    );
  }

  /**
   * Override generate() to bypass BaseProvider's AI-SDK path entirely.
   *
   * BaseProvider.runGenerateInActiveContext() calls prepareGenerationContext()
   * which unconditionally invokes getAISDKModelWithMiddleware() → getAISDKModel().
   * For Replicate that throws, because Replicate uses the predictions API, not
   * the Vercel AI SDK chat-completions contract.
   *
   * Special modes (image, video, avatar, music) are handled exactly as in the
   * base class. Plain text generation is routed through executeStream() and
   * unwrapped into an EnhancedGenerateResult so callers get a consistent shape.
   */
  override async generate(
    optionsOrPrompt: import("../types/index.js").TextGenerationOptions | string,
    _analysisSchema?: import("../types/index.js").ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const { IMAGE_GENERATION_MODELS } = await import("../core/constants.js");

    // Delegate special output modes to base class (which never calls getAISDKModel for these)
    if (
      options.output?.mode === "video" ||
      options.output?.mode === "avatar" ||
      options.output?.mode === "music"
    ) {
      return super.generate(options, _analysisSchema);
    }

    // Image-gen models: delegate to base which calls executeImageGeneration()
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      this.modelName.includes(m),
    );
    const requestsNonImageOutput =
      options.output?.format === "json" ||
      options.output?.format === "structured" ||
      options.output?.format === "text";
    if (isImageModel && !requestsNonImageOutput) {
      return super.generate(options, _analysisSchema);
    }

    // Structured / JSON output is not natively supported by the Replicate
    // predictions API. Surface a clear error instead of silently returning
    // unvalidated plain text.
    if (
      options.output?.format === "json" ||
      options.output?.format === "structured" ||
      (_analysisSchema !== null && _analysisSchema !== undefined)
    ) {
      throw new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        message:
          "Replicate models do not support structured-output / JSON schema. " +
          "Remove output.format or _analysisSchema, or use a provider that " +
          "implements the OpenAI chat-completions contract (e.g. openai, anthropic).",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    // Plain text generation — use the predict-then-stream path directly.
    // Pass `input.text` as the user text only; `systemPrompt` is forwarded
    // separately so `buildPromptFromOptions` inside executeStream prepends it
    // exactly once. Do NOT concatenate systemText here or the system prompt
    // would appear twice in the final API request.
    const userText = options.prompt ?? options.input?.text ?? "";
    const startTime = Date.now();
    const streamResult = await this.executeStream({
      input: { text: userText },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      abortSignal: options.abortSignal,
      timeout: options.timeout,
    });

    // Collect all chunks from the single-chunk stream
    let content = "";
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        content += chunk.content;
      }
    }

    const result: EnhancedGenerateResult = {
      content,
      provider: this.providerName,
      model: this.modelName,
      usage: { input: 0, output: 0, total: 0 },
    };

    logger.info(
      `[ReplicateProvider] generate() complete in ${Date.now() - startTime}ms — ${content.length} chars`,
    );
    return result;
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    const startTime = Date.now();
    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = (
      options as StreamOptions & { credentials?: NeurolinkCredentials }
    ).credentials?.replicate;
    const effectiveToken = perCallCreds?.apiToken?.trim() || this.apiToken;
    const effectiveBaseUrl = perCallCreds?.baseUrl || this.baseURL;
    const auth = getReplicateAuth({
      apiToken: effectiveToken,
      baseUrl: effectiveBaseUrl,
    });
    if (!auth) {
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message:
          "Replicate auth could not be resolved (REPLICATE_API_TOKEN missing).",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const prompt = buildPromptFromOptions(options);
    if (!prompt.trim()) {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_PARAMETERS,
        message:
          "Replicate predictions require a prompt (input.text or prompt)",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    // Replicate's chat schemas accept EITHER `max_tokens` OR `max_new_tokens`
    // depending on the model. Newer Llama 3.x routes reject setting both with
    // E1102 InvalidArgumentMaxTokens. We pass only `max_new_tokens` (the more
    // widely supported field) and let the model defaults apply when unset.
    const replicateInput: Record<string, unknown> = {
      prompt,
      ...(options.maxTokens !== undefined && {
        max_new_tokens: options.maxTokens,
      }),
      temperature: options.temperature,
      top_p: 1,
    };

    let prediction: Awaited<ReturnType<typeof predict>>;
    try {
      prediction = await predict(
        auth,
        {
          model: this.modelName,
          input: replicateInput,
        },
        { abortSignal: options.abortSignal },
      );
    } catch (err) {
      throw this.handleProviderError(err);
    }

    const text = flattenReplicateOutput(prediction.output);
    if (!text) {
      throw new Error(
        `Replicate prediction ${prediction.id} returned empty output`,
      );
    }

    const stream: AsyncIterable<{ content: string }> = {
      async *[Symbol.asyncIterator]() {
        yield { content: text };
      },
    };

    logger.info(
      `[ReplicateProvider] Generated ${text.length} chars in ${Date.now() - startTime}ms — model ${this.modelName} (prediction ${prediction.id})`,
    );

    return {
      stream,
      provider: this.providerName,
      model: this.modelName,
      finishReason: "stop",
      metadata: {
        startTime,
        streamId: `replicate-${prediction.id}`,
      },
    };
  }

  /**
   * Image-gen routing for Replicate-hosted image models (FLUX, SDXL, etc.).
   *
   * The dispatcher in baseProvider routes here when the `model` name
   * matches an entry in `IMAGE_GENERATION_MODELS`. Replicate model ids
   * use `owner/name(:version)?` format — image models route here as
   * long as the caller passes the FQMN.
   */
  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();
    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials?.replicate;
    const effectiveToken = perCallCreds?.apiToken?.trim() || this.apiToken;
    const effectiveBaseUrl = perCallCreds?.baseUrl || this.baseURL;
    const auth = getReplicateAuth({
      apiToken: effectiveToken,
      baseUrl: effectiveBaseUrl,
    });
    if (!auth) {
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message:
          "Replicate auth could not be resolved (REPLICATE_API_TOKEN missing).",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_PARAMETERS,
        message: "Replicate image-gen requires a prompt",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const extras = options as TextGenerationOptions & {
      aspectRatio?: string;
      negativePrompt?: string;
      seed?: number;
    };
    const replicateInput: Record<string, unknown> = {
      prompt,
      output_format: "png",
    };
    if (extras.aspectRatio) {
      replicateInput.aspect_ratio = extras.aspectRatio;
    }
    if (extras.negativePrompt) {
      replicateInput.negative_prompt = extras.negativePrompt;
    }
    if (extras.seed !== undefined) {
      replicateInput.seed = extras.seed;
    }

    let prediction: Awaited<ReturnType<typeof predict>>;
    try {
      prediction = await predict(
        auth,
        {
          model: this.modelName,
          input: replicateInput,
        },
        { abortSignal: options.abortSignal },
      );
    } catch (err) {
      throw this.handleProviderError(err);
    }

    let buffer: Buffer;
    try {
      buffer = await downloadPredictionOutput(prediction, MAX_IMAGE_BYTES);
    } catch (err) {
      throw this.handleProviderError(err);
    }
    const base64 = buffer.toString("base64");

    logger.info(
      `[ReplicateProvider] Generated image (${buffer.length} bytes) in ${Date.now() - startTime}ms — model ${this.modelName}`,
    );

    return {
      content: prompt,
      provider: this.providerName,
      model: this.modelName,
      usage: { input: 0, output: 0, total: 0 },
      imageOutput: { base64 },
    };
  }

  protected formatProviderError(error: unknown): Error {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";
    const originalError = error instanceof Error ? error : undefined;
    if (
      message.includes("401") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("invalid token")
    ) {
      return new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_AUTH_FAILED,
        message:
          "Invalid Replicate API token. Get one at https://replicate.com/account/api-tokens",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider: "replicate" },
        originalError,
      });
    }
    if (
      message.includes("402") ||
      message.toLowerCase().includes("insufficient credit")
    ) {
      return new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_QUOTA_EXCEEDED,
        message:
          "Replicate insufficient credit. Top up at https://replicate.com/account/billing — most image/music models require a paid balance.",
        category: ErrorCategory.RESOURCE,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider: "replicate" },
        originalError,
      });
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_QUOTA_EXCEEDED,
        message: "Replicate rate limit exceeded. Back off and retry.",
        category: ErrorCategory.RESOURCE,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { provider: "replicate" },
        originalError,
      });
    }
    if (
      message.toLowerCase().includes("not found") ||
      message.includes("404")
    ) {
      return new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        message: `Replicate model '${this.modelName}' not found. Use owner/name or owner/name:version format. Browse https://replicate.com/explore`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { provider: "replicate", model: this.modelName },
        originalError,
      });
    }
    return new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      message: `Replicate error: ${message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider: "replicate" },
      originalError,
    });
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiToken === "string" && this.apiToken.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultReplicateModel(),
      baseURL: this.baseURL,
    };
  }
}

export default ReplicateProvider;
