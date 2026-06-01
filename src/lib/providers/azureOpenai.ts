import { type AIProviderName, APIVersions } from "../constants/enums.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
} from "../types/index.js";
import type {
  NeurolinkCredentials,
  OpenAICompatChatRequest,
  UnknownRecord,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createAzureAPIKeyConfig,
  createAzureEndpointConfig,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { transformParamsForLogging } from "../utils/transformationUtils.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";
import { requiresMaxCompletionTokens } from "./openaiChatCompletionsClient.js";

/**
 * Azure OpenAI Provider — direct HTTP, no AI SDK.
 *
 * Supports both classic Azure OpenAI Service endpoints
 * ("*.openai.azure.com", "*.cognitiveservices.azure.com") and the newer
 * Azure AI Foundry endpoints ("*.services.ai.azure.com").
 *
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class overrides the URL builder and
 * auth headers to accommodate Azure's deployment-based routing and
 * `api-key` header (rather than Bearer tokens).
 *
 * @see https://learn.microsoft.com/azure/cognitive-services/openai/
 */
export class AzureOpenAIProvider extends OpenAIChatCompletionsProvider {
  // Azure-specific routing state resolved once in the constructor.
  protected readonly azureDeployment: string;
  protected readonly azureApiVersion: string;
  // Parsed from the endpoint — mutually exclusive: either resourceName (for
  // classic hosts) or foundryBaseURL (for AI Foundry) is non-empty.
  protected readonly azureResourceOrigin: string;
  protected readonly azureDeploymentPathPrefix: string;
  // Explicit `max_completion_tokens` capability. `undefined` ⇒ fall back to the
  // deployment-name heuristic in adjustRequestBody().
  protected readonly useMaxCompletionTokensOverride?: boolean;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["azure"],
  ) {
    const apiKey =
      credentials?.apiKey || process.env.AZURE_OPENAI_API_KEY || "";

    // -----------------------------------------------------------------------
    // Parse the AZURE_OPENAI_ENDPOINT environment variable (or credentials)
    // into the pieces needed to build deployment-based chat completions URLs.
    //
    // Two supported endpoint formats:
    //
    //  1. Classic Azure OpenAI / Cognitive Services:
    //       https://<resource>.openai.azure.com
    //       https://<resource>.cognitiveservices.azure.com
    //     The @ai-sdk/azure tradition was to pass the bare resource subdomain
    //     and let the SDK reconstruct the full URL.  We instead keep the full
    //     origin and emit the standard deployment path from it:
    //       {origin}/openai/deployments/{deployment}/chat/completions
    //
    //  2. Azure AI Foundry:
    //       https://<host>.services.ai.azure.com[/openai]
    //     The host has no resource-name subdomain convention.  The operator
    //     may or may not include the "/openai" path prefix; we normalise that.
    //     Final URL pattern:
    //       {origin}{normalisedPath}/deployments/{deployment}/chat/completions
    //
    // In both cases we pass the "resource origin" (scheme+host) as `baseURL`
    // to super so that `getAvailableModels()` can still build a models URL
    // from it if needed; `getChatCompletionsURL()` builds the real path.
    // -----------------------------------------------------------------------
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";

    let endpointUrl: URL | undefined;
    if (endpoint) {
      try {
        endpointUrl = new URL(
          endpoint.includes("://") ? endpoint : `https://${endpoint}`,
        );
      } catch {
        endpointUrl = undefined;
      }
    }

    const endpointHost = endpointUrl?.hostname ?? "";
    // Strip trailing slashes from the pathname; treat "/" as empty.
    const endpointPath =
      endpointUrl?.pathname && endpointUrl.pathname !== "/"
        ? endpointUrl.pathname.replace(/\/+$/, "")
        : "";

    // Classic hosts encode the resource name as a subdomain.
    const isClassicAzureHost = /\.(openai|cognitiveservices)\.azure\.com$/.test(
      endpointHost,
    );

    // For classic hosts the deployment URL path always starts with "/openai".
    // For Foundry hosts we reuse whatever the operator supplied, appending
    // "/openai" only when the path doesn't already end with it (or a
    // versioned variant like "/openai/v1").
    let deploymentPathPrefix: string;
    if (isClassicAzureHost) {
      deploymentPathPrefix = "/openai";
    } else {
      const hasOpenAIPathSuffix = /\/openai(?:\/v\d+)?$/.test(endpointPath);
      deploymentPathPrefix = hasOpenAIPathSuffix
        ? endpointPath
        : `${endpointPath}/openai`;
    }

    const resourceOrigin = endpointUrl?.origin ?? "";

    const deployment =
      credentials?.deploymentName ||
      modelName ||
      process.env.AZURE_OPENAI_MODEL ||
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
      "gpt-4o";

    const apiVersion =
      credentials?.apiVersion ||
      process.env.AZURE_API_VERSION ||
      APIVersions.AZURE_LATEST;

    // Deployment names are user-defined, so a model-name heuristic can't
    // reliably tell whether the backing model needs max_completion_tokens.
    // Prefer an explicit signal (credentials or env); fall back to the
    // heuristic only when unset.
    const envMaxCompletion = process.env.AZURE_OPENAI_USE_MAX_COMPLETION_TOKENS;
    const maxCompletionOverride =
      credentials?.useMaxCompletionTokens ??
      (envMaxCompletion === undefined
        ? undefined
        : /^(1|true|yes)$/i.test(envMaxCompletion));

    // Validate required credentials before committing.
    if (!apiKey) {
      validateApiKey(createAzureAPIKeyConfig());
    }
    if (!resourceOrigin) {
      validateApiKey(createAzureEndpointConfig());
    }

    // Pass the resource origin as baseURL so the base class can construct
    // auxiliary URLs (e.g. /models) from it when needed.
    super("azure" as AIProviderName, modelName, sdk, {
      baseURL: resourceOrigin,
      apiKey,
    });

    this.azureDeployment = deployment;
    this.azureApiVersion = apiVersion;
    this.azureResourceOrigin = resourceOrigin;
    this.azureDeploymentPathPrefix = deploymentPathPrefix;
    this.useMaxCompletionTokensOverride = maxCompletionOverride;

    if (logger.shouldLog("debug")) {
      logger.debug(
        "Azure OpenAI Provider initialized",
        transformParamsForLogging({
          deployment: this.azureDeployment,
          resourceOrigin: this.azureResourceOrigin,
          deploymentPathPrefix: this.azureDeploymentPathPrefix,
          apiVersion: this.azureApiVersion,
          provider: "azure",
        }),
      );
    }
  }

  // ===========================================================================
  // Abstract-hook implementations
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return "azure" as AIProviderName;
  }

  /**
   * The "default model" for Azure is the deployment name — it's the
   * identifier callers pass to select a deployment.
   */
  protected getDefaultModel(): string {
    return this.azureDeployment;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, "azure");
    }
    const errorObj = error as UnknownRecord;
    if (
      errorObj?.message &&
      typeof errorObj.message === "string" &&
      errorObj.message.includes("401")
    ) {
      return new AuthenticationError(
        "Invalid Azure OpenAI API key or endpoint.",
        "azure",
      );
    }
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    return new ProviderError(`Azure OpenAI error: ${message}`, "azure");
  }

  // ===========================================================================
  // New overridable hooks (provided by the base-enhancement branch)
  // ===========================================================================

  /**
   * Builds the full Azure deployment chat completions URL.
   *
   * Pattern:
   *   {resourceOrigin}{deploymentPathPrefix}/deployments/{deployment}/chat/completions?api-version={apiVersion}
   *
   * Examples:
   *   Classic:  https://myresource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-04-01-preview
   *   Foundry:  https://myhost.services.ai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-04-01-preview
   */
  protected getChatCompletionsURL(modelId: string): string {
    // modelId is the deployment name when it has been resolved; fall back to
    // the stored deployment when the base passes a generic placeholder.
    const deployment = modelId || this.azureDeployment;
    const prefix = this.azureDeploymentPathPrefix.replace(/\/+$/, "");
    return (
      `${this.azureResourceOrigin}${prefix}/deployments/${deployment}` +
      `/chat/completions?api-version=${this.azureApiVersion}`
    );
  }

  /**
   * Azure uses `api-key` rather than the standard `Authorization: Bearer`
   * header expected by OpenAI-compatible endpoints.
   */
  protected getAuthHeaders(): Record<string, string> {
    return { "api-key": this.config.apiKey };
  }

  /**
   * Newer Azure deployments (o-series, gpt-5+) reject `max_tokens` and require
   * `max_completion_tokens`. The `@ai-sdk/openai` path this migration replaced
   * renamed the field automatically; replicate that here.
   *
   * Capability is taken from the explicit `useMaxCompletionTokens` override
   * (credentials / `AZURE_OPENAI_USE_MAX_COMPLETION_TOKENS`) when set — Azure
   * deployment names are user-defined, so a `chat-prod` gpt-5 deployment can't
   * be detected from the name. When unset, fall back to a best-effort
   * model-name heuristic for the common case where the deployment echoes the
   * model (e.g. `gpt-5.4`).
   */
  protected adjustRequestBody(
    body: OpenAICompatChatRequest,
    modelId: string,
  ): OpenAICompatChatRequest {
    const needsMaxCompletion =
      this.useMaxCompletionTokensOverride ??
      requiresMaxCompletionTokens(modelId);
    if (body.max_tokens !== undefined && needsMaxCompletion) {
      return {
        ...body,
        max_completion_tokens: body.max_tokens,
        max_tokens: undefined,
      };
    }
    return body;
  }
}
