import type { AIProviderName } from "../constants/enums.js";
import { XorModels } from "../constants/enums.js";
import type {
  DecisionError,
  DecisionErrorKind,
  DecisionPreparedMedia,
  DecisionState,
  NeurolinkCredentials,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  decisionBaseURLProblem,
  describeDecisionBaseURLForLog,
  describeValidationErrors,
  isRecord,
  redactCredentials,
  SystemOneDecisionProvider,
} from "./systemOneDecision.js";

const XOR_ROUTE = "/v1/systemone";

/**
 * XOR_BASE_URL is the origin of a deployment, but a `LITELLM_BASE_URL`-style
 * value ends in `/v1`, which the route already carries. Both spellings reduce
 * to the same base.
 */
function normalizeBaseURL(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/**
 * What a reply says when the prefill was too long for the model to read. The
 * live route's 500 said the input "is longer than the model's context length"
 * (docs/getting-started/providers/xor.md#limits), and a LiteLLM proxy's
 * context-window error says "maximum context length"; both match.
 */
const CONTEXT_LENGTH_MESSAGE =
  /(context|prefill|prompt).{0,40}(length|limit|too long|exceed)|(too long|exceeds?).{0,40}(context|tokens)/i;

/**
 * A base URL that cannot work is refused up front; see
 * {@link decisionBaseURLProblem}.
 */
function baseURLProblem(baseURL: string): string | undefined {
  return decisionBaseURLProblem(
    baseURL,
    "XOR",
    "Set XOR_BASE_URL or pass credentials.xor.baseURL to the origin, and give the key through XOR_API_KEY or credentials.xor.apiKey.",
  );
}

/**
 * Status first, then the text for the two statuses an over-long request can
 * come back as. The live route answered one with a 500, which is retried
 * unless its text says the context was exceeded. A server that validates the
 * length itself answers 400, and a FastAPI-style front end 422, with the same
 * wording; those are `max_tokens_exceeded` too, never a plain
 * `invalid_request`, so a consumer can tell "shorten it" from "fix the call".
 * A 403 and a 402 stay `invalid_request` whatever they say (see
 * `parseDecisionError`).
 */
function xorErrorKind(status: number, message: string): DecisionErrorKind {
  if (status === 401) {
    return "authentication";
  }
  if (status === 413) {
    return "max_tokens_exceeded";
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 503) {
    return "overloaded";
  }
  if (status >= 500 || status === 400 || status === 422) {
    if (CONTEXT_LENGTH_MESSAGE.test(message)) {
      return "max_tokens_exceeded";
    }
    return status >= 500 ? "server" : "invalid_request";
  }
  return "invalid_request";
}

/**
 * Two envelopes reach the client. A LiteLLM proxy answers its own rejections
 * (a bad key, a team without the model, a budget) as
 * `{"error":{"message","type","code"}}`; XOR's own server answers as
 * `{"error":"<string>"}` — a shape that neither TypeSafe's nor Laya's parser
 * recognises, since both require `body.error` to be an object. FastAPI's
 * `{"detail":…}` is read too, in case something in front speaks it.
 */
function readXorErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  const { error, detail } = body;
  if (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  if (Array.isArray(detail)) {
    return `Request failed validation — ${describeValidationErrors(detail)}`;
  }
  return typeof detail === "string" && detail.length > 0 ? detail : undefined;
}

/**
 * XOR Provider — the `decide` inference type only.
 *
 * XOR is Juspay's open-weights "System One" decision model, post-trained from
 * Qwen3.6-35B-A3B: the same typed `noul` / `choice` / `score` questions as
 * TypeSafe's Jev, on the same wire, in one batched pass. Unlike Jev and Laya it
 * also reads images and one video. The request loop, retries, auth circuit
 * breaker and answer parsing are shared with every decision provider in
 * {@link SystemOneDecisionProvider}.
 *
 * @see https://huggingface.co/juspay/xor
 */
export class XorProvider extends SystemOneDecisionProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["xor"],
  ) {
    super(modelName, "xor" as AIProviderName, sdk);
    this.apiKey =
      credentials?.apiKey?.trim() || (process.env.XOR_API_KEY?.trim() ?? "");
    // No built-in endpoint: XOR is reached at a deployment or through a proxy
    // route to one, so the base URL comes only from config. `||`, not `??`, so
    // a blank one counts as unset.
    this.baseURL = normalizeBaseURL(
      credentials?.baseURL?.trim() || process.env.XOR_BASE_URL?.trim() || "",
    );

    // A base URL that `baseURLProblem` refuses is not logged at all: it can
    // carry `user:pass@` or a `?token=`.
    logger.debug("XOR Provider initialized (decide only)", {
      modelName: this.modelName,
      baseURL: describeDecisionBaseURLForLog(
        this.baseURL,
        baseURLProblem(this.baseURL),
      ),
    });
  }

  protected getDefaultModel(): string {
    return getProviderModel("XOR_MODEL", XorModels.XOR_1_1);
  }

  protected vendorLabel(): string {
    return "XOR";
  }

  protected vendorDisplayName(): string {
    return "XOR";
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return "XOR requires an API key. Set XOR_API_KEY or pass credentials.xor.apiKey.";
  }

  protected override missingConfigMessage(): string | undefined {
    return this.baseURL
      ? baseURLProblem(this.baseURL)
      : "XOR requires a base URL. Set XOR_BASE_URL or pass credentials.xor.baseURL.";
  }

  protected decisionEndpoint(): string {
    return `${this.baseURL}${XOR_ROUTE}`;
  }

  protected decisionHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * `model` is always sent. A LiteLLM proxy checks team access against the
   * body's `model`, and refuses a request that names none. `images` is
   * omitted rather than sent empty, which the server rejects.
   */
  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
    media?: DecisionPreparedMedia,
  ): Record<string, unknown> {
    return {
      model,
      state,
      questions,
      ...(media && media.images.length > 0 ? { images: media.images } : {}),
      ...(media?.video ? { video: media.video } : {}),
    };
  }

  /**
   * A 403 is deliberately NOT `authentication`: on a LiteLLM proxy it means the
   * team's allow-list lacks the model, which an admin can fix at any time, and
   * `authentication` would trip the per-instance breaker and keep XOR disabled
   * until restart even after access is granted. A 402 (a budget) is the same
   * kind of fixable gap. `DecisionErrorKind` has no billing kind, so both map
   * to `invalid_request`.
   */
  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    const fallback = `XOR request failed with HTTP ${status}`;
    const message =
      redactCredentials(
        readXorErrorMessage(payload) ?? fallback,
        this.apiKey,
      ) || fallback;
    const kind = xorErrorKind(status, message);
    return {
      kind,
      message,
      status,
      requestId,
      retryable:
        kind === "rate_limit" || kind === "overloaded" || kind === "server",
    };
  }

  /**
   * XOR's server sets `x-request-id` and `x-typesafe-request-id` to one value.
   * A proxy in front may replace or drop them, so its own call id is the last
   * resort.
   */
  protected readRequestId(headers: Headers): string | undefined {
    return (
      headers.get("x-request-id") ??
      headers.get("x-typesafe-request-id") ??
      headers.get("x-litellm-call-id") ??
      undefined
    );
  }
}
