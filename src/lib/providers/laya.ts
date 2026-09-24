import type { AIProviderName } from "../constants/enums.js";
import { LayaModels } from "../constants/enums.js";
import type {
  DecisionError,
  DecisionErrorKind,
  DecisionState,
  NeurolinkCredentials,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlForError } from "../utils/logSanitize.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  describeValidationErrors,
  isRecord,
  SystemOneDecisionProvider,
} from "./systemOneDecision.js";

/**
 * LiteLLM echoes credentials back in its error texts, in more than one
 * wording: a masked key plus its hash on a rejected key, the whole key when it
 * does not look like a LiteLLM key, a key hash on a rate limit. None of it
 * belongs in an error message or a log, whatever the wording, so the
 * configured key, anything shaped like a LiteLLM key and any long hex run are
 * all removed.
 */
function redactCredentials(message: string, apiKey: string): string {
  const withoutKey = apiKey
    ? message.split(apiKey).join("[redacted]")
    : message;
  return withoutKey
    .replace(/\.?\s*Received API Key\s*=[\s\S]*$/, "")
    .replace(/\bsk-[A-Za-z0-9._-]+/g, "[redacted]")
    .replace(/\b[0-9a-f]{32,}\b/gi, "[redacted]")
    .trim();
}

/**
 * Normalise the two envelopes a Laya failure can arrive in.
 *
 * LiteLLM's own, `{"error":{"message","type","code"}}`, for anything the proxy
 * rejects before Laya sees it (a bad key, a rate limit). FastAPI's, from
 * Laya's server: `{"detail":"..."}` for its own checks (question types, the
 * question cap) and `{"detail":[{loc,msg,input}]}` for request validation.
 */
function parseLayaError(
  status: number,
  body: unknown,
  requestId: string | undefined,
): DecisionError {
  const retryable = status === 429 || status >= 500;
  const kind: DecisionErrorKind =
    status === 401 || status === 403
      ? "authentication"
      : status === 413
        ? "max_tokens_exceeded"
        : status === 429
          ? "rate_limit"
          : status === 503
            ? "overloaded"
            : status >= 500
              ? "server"
              : "invalid_request";

  const proxyError =
    isRecord(body) && isRecord(body.error) ? body.error : undefined;
  if (
    proxyError &&
    typeof proxyError.message === "string" &&
    proxyError.message.length > 0
  ) {
    return {
      kind,
      message: proxyError.message,
      status,
      requestId,
      retryable,
    };
  }

  const detail = isRecord(body) ? body.detail : undefined;
  if (Array.isArray(detail)) {
    return {
      kind: "invalid_request",
      message: `Request failed validation — ${describeValidationErrors(detail)}`,
      status,
      requestId,
      retryable: false,
    };
  }
  if (typeof detail === "string" && detail.length > 0) {
    return { kind, message: detail, status, requestId, retryable };
  }
  return {
    kind,
    message: `Laya request failed with HTTP ${status}`,
    status,
    requestId,
    retryable,
  };
}

/**
 * Laya Provider — the `decide` inference type only.
 *
 * Laya is Convai Innovations' open-weights "System One" decision model: the
 * same typed `noul` / `choice` / `score` questions as TypeSafe's Jev, answered
 * by an encoder in one forward pass, on the same wire. The request loop,
 * retries, auth circuit breaker and answer parsing are shared with every
 * decision provider in {@link SystemOneDecisionProvider}.
 *
 * Its encoders read far less than Jev: 1,024 tokens on the `typed-decisions`
 * and `multilingual` checkpoints, 512 on `english`. The descriptor's
 * `decisionLimits` refuses what does not fit rather than letting the server
 * cut the state off silently.
 *
 * @see https://github.com/NandhaKishorM/laya
 */
export class LayaProvider extends SystemOneDecisionProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["laya"],
  ) {
    super(modelName, "laya" as AIProviderName, sdk);
    this.apiKey =
      credentials?.apiKey?.trim() || (process.env.LAYA_API_KEY?.trim() ?? "");
    // No built-in endpoint: Laya is self-hosted or reached through a proxy
    // (a Laya server, or a LiteLLM pass-through route to one), so the base URL
    // comes only from config. `||`, not `??`, so a blank one counts as unset.
    this.baseURL = (
      credentials?.baseURL?.trim() ||
      process.env.LAYA_BASE_URL?.trim() ||
      ""
    ).replace(/\/+$/, "");

    // A self-hosted LAYA_BASE_URL can carry `user:pass@` or a `?token=`.
    logger.debug("Laya Provider initialized (decide only)", {
      modelName: this.modelName,
      baseURL: this.baseURL ? redactUrlForError(this.baseURL) : "(not set)",
    });
  }

  protected getDefaultModel(): string {
    return getProviderModel("LAYA_MODEL", LayaModels.TYPED_DECISIONS);
  }

  protected vendorLabel(): string {
    return "Laya";
  }

  protected vendorDisplayName(): string {
    return "Laya";
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return "Laya requires an API key. Set LAYA_API_KEY or pass credentials.laya.apiKey.";
  }

  protected override missingConfigMessage(): string | undefined {
    return this.baseURL
      ? undefined
      : "Laya requires a base URL. Set LAYA_BASE_URL or pass credentials.laya.baseURL.";
  }

  protected decisionEndpoint(): string {
    return `${this.baseURL}/predict`;
  }

  protected decisionHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /** `auto` means "let Laya's router choose", which it does when no model is named. */
  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
  ): Record<string, unknown> {
    return model === LayaModels.AUTO
      ? { state, questions }
      : { model, state, questions };
  }

  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    const parsed = parseLayaError(status, payload, requestId);
    const message = redactCredentials(parsed.message, this.apiKey);
    return {
      ...parsed,
      message: message || `Laya request failed with HTTP ${status}`,
    };
  }

  protected readRequestId(headers: Headers): string | undefined {
    return headers.get("x-litellm-call-id") ?? undefined;
  }

  /**
   * The checkpoint that actually answered is `routing.model` — the one Laya's
   * router picked when the request said `auto`.
   */
  protected override resolveResponseModel(
    payload: Record<string, unknown>,
    requestedModel: string,
  ): string {
    const routing = payload.routing;
    if (isRecord(routing) && typeof routing.model === "string") {
      return routing.model;
    }
    return super.resolveResponseModel(payload, requestedModel);
  }
}
