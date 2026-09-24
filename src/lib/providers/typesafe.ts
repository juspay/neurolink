import type { AIProviderName } from "../constants/enums.js";
import { TypeSafeModels } from "../constants/enums.js";
import type {
  DecisionError,
  DecisionErrorKind,
  DecisionModelCard,
  DecisionQuestion,
  DecisionState,
  NeurolinkCredentials,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlForError } from "../utils/logSanitize.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  asNumber,
  DEFAULT_DECISION_TIMEOUT_MS,
  describeValidationErrors,
  isRecord,
  SystemOneDecisionProvider,
} from "./systemOneDecision.js";

const TYPESAFE_DEFAULT_BASE_URL = "https://api.typesafe.ai";

/**
 * Vercel AI Gateway's evaluation-model endpoint.
 *
 * Vercel's AI SDK models a decision model as `EvaluationModelV4`, separate
 * from `LanguageModelV4` — the same conclusion this codebase reached with
 * `inferenceKinds`, arrived at independently. The gateway therefore has its
 * own route rather than reusing the chat one.
 */
const TYPESAFE_DEFAULT_GATEWAY_URL =
  "https://ai-gateway.vercel.sh/v4/ai/evaluation-model";

/** Gateway model id for Jev. The gateway carries it in a header, not the body. */
const GATEWAY_MODEL_ID = "typesafe-ai/jev";

/**
 * Protocol version header the gateway requires. Omitting it fails the whole
 * request with a 400 ("Unsupported gateway protocol version") rather than
 * defaulting, so it is not optional.
 */
const GATEWAY_PROTOCOL_VERSION = "0.0.1";

/** Evaluation-model spec version the request body conforms to. */
const GATEWAY_SPEC_VERSION = "4";

/**
 * The binding limit in practice: `state` plus the SINGLE LONGEST question.
 * Measured by bisection at single-character resolution — 33,002 reported
 * input tokens accepted, 33,003 not.
 */
export const TYPESAFE_MAX_STATE_TOKENS = 33_000;

/**
 * The separate, larger ceiling on `state` plus ALL questions combined. A
 * request can carry a near-ceiling state *and* 400 extra questions (37,679
 * tokens total, verified) — questions do not compete with state for the
 * 33K budget, only for this one.
 */
export const TYPESAFE_MAX_REQUEST_TOKENS = 64_000;

/**
 * Per-question confidence the gateway reports out-of-band, keyed by question
 * id, under `providerMetadata.typesafe.confidence`. Absent on the direct
 * transport, which puts confidence on each answer instead.
 */
function readReportedConfidence(payload: unknown): Record<string, number> {
  if (!isRecord(payload) || !isRecord(payload.providerMetadata)) {
    return {};
  }
  const vendor = payload.providerMetadata.typesafe;
  if (!isRecord(vendor) || !isRecord(vendor.confidence)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(vendor.confidence)) {
    const n = asNumber(value);
    if (n !== undefined) {
      out[id] = n;
    }
  }
  return out;
}

/**
 * Gateway error `type` → our kind. The gateway's own slugs are the only
 * reliable discriminator: it returns 403 for both a credential that cannot
 * reach AI Gateway and an account with no card on file, and those want very
 * different words in front of a reader.
 */
const GATEWAY_ERROR_KIND: Record<string, DecisionErrorKind> = {
  authentication_error: "authentication",
  customer_verification_required: "authentication",
  invalid_request_error: "invalid_request",
  rate_limit_exceeded: "rate_limit",
  internal_server_error: "server",
};

function parseGatewayError(
  status: number,
  error: Record<string, unknown>,
  requestId: string | undefined,
  retryable: boolean,
): DecisionError {
  const type = typeof error.type === "string" ? error.type : undefined;
  const kind =
    (type ? GATEWAY_ERROR_KIND[type] : undefined) ??
    (status === 401 || status === 403
      ? "authentication"
      : status === 429
        ? "rate_limit"
        : status >= 500
          ? "server"
          : "invalid_request");
  const message =
    typeof error.message === "string" && error.message.length > 0
      ? error.message
      : (type ?? `AI Gateway request failed with HTTP ${status}`);
  return { kind, message, status, requestId, retryable };
}

/**
 * Normalise the three error envelopes into one shape.
 *
 * Shape A (direct, application): `{"detail":{"error_type":"...","message":"..."}}`
 * Shape B (direct, validation):  `{"detail":[{"type":"missing","loc":[...],...}]}`
 * Shape C (gateway):             `{"error":{"message":"...","type":"...","code":400}}`
 *
 * Shape B echoes the offending `input` back, which can contain the caller's
 * state, so only `loc`/`msg` are surfaced — never `input`.
 *
 * Shape C is a different vendor's envelope reached through the same method,
 * and it was invisible until the gateway was exercised live: every gateway
 * failure fell through to `HTTP <status>` with the real cause discarded. The
 * worst case was a 403 `customer_verification_required` — a billing state,
 * not a bad key — reported as a flat 403 and then tripping the auth circuit
 * breaker under the message "API key rejected", which points the reader at
 * the one thing that is not wrong.
 */
function parseTypeSafeError(
  status: number,
  body: unknown,
  requestId?: string,
): DecisionError {
  const retryable = status === 429 || status === 529 || status >= 500;
  const gateway =
    isRecord(body) && isRecord(body.error) ? body.error : undefined;
  if (gateway) {
    return parseGatewayError(status, gateway, requestId, retryable);
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

  const errorType =
    isRecord(detail) && typeof detail.error_type === "string"
      ? detail.error_type
      : undefined;

  // 403 for a MISSING Authorization header and 401 for an INVALID key —
  // inverted from the usual convention, and from TypeSafe's own docs, which
  // collapse both into one 401 row. Verified live.
  const kind: DecisionErrorKind =
    errorType === "max_tokens_exceeded"
      ? "max_tokens_exceeded"
      : status === 401 || status === 403
        ? "authentication"
        : status === 429
          ? "rate_limit"
          : status === 529
            ? "overloaded"
            : status >= 500
              ? "server"
              : "invalid_request";

  // `max_tokens_exceeded` is returned with no `message` at all, and it is the
  // one error a long-context caller is most likely to hit — so the fallback
  // has to be a real sentence rather than the bare error_type slug.
  const fallback =
    kind === "max_tokens_exceeded"
      ? `State plus questions exceeded the model's input limit: keep state plus the longest single question under ~${TYPESAFE_MAX_STATE_TOKENS} tokens, and state plus all questions under ~${TYPESAFE_MAX_REQUEST_TOKENS}.`
      : (errorType ?? `TypeSafe request failed with HTTP ${status}`);

  const message =
    isRecord(detail) && typeof detail.message === "string"
      ? detail.message
      : fallback;

  return { kind, message, status, requestId, retryable };
}

/**
 * TypeSafe Provider — the `decide` inference type only.
 *
 * Jev is a "System One" model: it takes one `state` plus a map of typed
 * questions and returns one typed answer each, evaluated in a single
 * parallel pass. The request loop, retries, auth circuit breaker and answer
 * parsing are shared with every decision provider in
 * {@link SystemOneDecisionProvider}; this class holds only what is TypeSafe's.
 *
 * Its descriptor declares `inferenceKinds: ["decide"]`, which keeps it out
 * of auto-select and the health sweep.
 *
 * Two measured properties shape the API: latency is flat in question count
 * (1 question 393ms, 400 questions 465ms) while concurrent requests queue.
 * Callers therefore batch every question into one `decide()` call.
 *
 * Two transports reach the same model. The direct one is TypeSafe's own API,
 * billed against a TypeSafe key. The gateway one is Vercel's AI Gateway
 * evaluation-model route, billed against a Vercel account — useful to a host
 * that already has one and does not want a second vendor relationship. They
 * differ on the wire (vocabulary, where the model is named, and where
 * `confidence` is reported) and not at all in `DecisionResult`.
 *
 * @see https://docs.typesafe.ai/api
 */
export class TypeSafeProvider extends SystemOneDecisionProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly gatewayURL: string;

  /** Which wire this instance speaks. Resolved once, in the constructor. */
  private readonly transport: "direct" | "gateway";

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["typesafe"],
  ) {
    super(modelName, "typesafe" as AIProviderName, sdk);

    const directKey =
      credentials?.apiKey?.trim() ||
      (process.env.TYPESAFE_API_KEY?.trim() ?? "");
    const gatewayKey =
      credentials?.gatewayApiKey?.trim() ||
      (process.env.AI_GATEWAY_API_KEY?.trim() ?? "");

    // Explicit choice wins; otherwise the gateway is used only when it is the
    // ONLY key available. A host holding both keeps the direct transport,
    // because that is the one whose confidence figures are the vendor's own
    // calibrated values rather than derived from the distribution.
    const requested =
      credentials?.transport ??
      (process.env.TYPESAFE_TRANSPORT?.trim() as
        | "direct"
        | "gateway"
        | undefined);
    this.transport =
      requested === "gateway" || requested === "direct"
        ? requested
        : !directKey && gatewayKey
          ? "gateway"
          : "direct";

    this.apiKey = this.transport === "gateway" ? gatewayKey : directKey;
    this.baseURL = (
      credentials?.baseURL ??
      process.env.TYPESAFE_BASE_URL ??
      TYPESAFE_DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    this.gatewayURL = (
      credentials?.gatewayURL?.trim() ||
      process.env.TYPESAFE_GATEWAY_URL?.trim() ||
      TYPESAFE_DEFAULT_GATEWAY_URL
    ).replace(/\/+$/, "");

    logger.debug("TypeSafe Provider initialized (decide only)", {
      modelName: this.modelName,
      transport: this.transport,
      baseURL: redactUrlForError(
        this.transport === "gateway" ? this.gatewayURL : this.baseURL,
      ),
    });
  }

  protected getDefaultModel(): string {
    return getProviderModel("TYPESAFE_MODEL", TypeSafeModels.JEV_LATEST);
  }

  protected vendorLabel(): string {
    return "TypeSafe";
  }

  protected vendorDisplayName(): string {
    return "TypeSafe (Jev)";
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return this.transport === "gateway"
      ? "The TypeSafe gateway transport requires a Vercel AI Gateway key. Set AI_GATEWAY_API_KEY or pass credentials.typesafe.gatewayApiKey."
      : "TypeSafe requires an API key. Set TYPESAFE_API_KEY or pass credentials.typesafe.apiKey.";
  }

  /**
   * The gateway already speaks the neutral vocabulary this codebase uses, so
   * only the direct transport needs the `noul` rename.
   */
  protected override encodeQuestion(
    question: DecisionQuestion,
  ): Record<string, unknown> {
    return this.transport === "gateway"
      ? question
      : super.encodeQuestion(question);
  }

  /**
   * The gateway names the model in a header and rejects a body that carries
   * one; the direct API requires it in the body.
   */
  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
  ): Record<string, unknown> {
    return this.transport === "gateway"
      ? { state, questions }
      : { model, state, questions };
  }

  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    return parseTypeSafeError(status, payload, requestId);
  }

  /**
   * The gateway does not omit confidence after all — it RELOCATES it, to
   * `providerMetadata.typesafe.confidence.<questionId>`, and leaves the answer
   * objects themselves without one. Preferring it over the derived peak
   * matters because the two disagree on any distribution that is not already
   * near-certain, and the router's asymmetric bars are tuned against the
   * vendor's calibrated figure, not against max(probabilities).
   */
  protected override reportedConfidence(
    payload: unknown,
  ): Record<string, number> {
    return readReportedConfidence(payload);
  }

  protected readRequestId(headers: Headers): string | undefined {
    return headers.get("x-typesafe-request-id") ?? undefined;
  }

  protected override diagnosticContext(): Record<string, unknown> {
    return { transport: this.transport };
  }

  /** Where a decision request goes for this instance's transport. */
  protected decisionEndpoint(): string {
    return this.transport === "gateway"
      ? this.gatewayURL
      : `${this.baseURL}/v1/systemone`;
  }

  /**
   * Headers for this instance's transport.
   *
   * The gateway's three `ai-*` headers are all load-bearing:
   * `ai-gateway-protocol-version` omitted fails the request outright rather
   * than defaulting, `ai-model-id` is how the model is named at all (the body
   * carries no `model`), and `ai-evaluation-model-specification-version`
   * selects the request/response shape this provider parses.
   */
  protected decisionHeaders(): Record<string, string> {
    const base = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    return this.transport === "gateway"
      ? {
          ...base,
          "ai-gateway-auth-method": "api-key",
          "ai-gateway-protocol-version": GATEWAY_PROTOCOL_VERSION,
          "ai-model-id": GATEWAY_MODEL_ID,
          "ai-evaluation-model-specification-version": GATEWAY_SPEC_VERSION,
        }
      : base;
  }

  /** Which transport this instance resolved to. Exposed for diagnostics. */
  getDecisionTransport(): "direct" | "gateway" {
    return this.transport;
  }

  /**
   * The model aliases this key may send in `model`.
   *
   * Direct transport only: the gateway names the model in a header and
   * publishes its own catalogue, so there is no equivalent listing behind
   * this key.
   */
  async listDecisionModels(): Promise<DecisionModelCard[]> {
    if (this.transport === "gateway") {
      throw this.decisionError({
        kind: "invalid_request",
        message:
          "Model listing is a TypeSafe API operation; the gateway transport has no equivalent endpoint.",
        retryable: false,
      });
    }
    const response = await this.proxyFetch(`${this.baseURL}/v1/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(
        this.defaultTimeout ?? DEFAULT_DECISION_TIMEOUT_MS,
      ),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw this.decisionError(
        parseTypeSafeError(
          response.status,
          payload,
          response.headers.get("x-typesafe-request-id") ?? undefined,
        ),
      );
    }
    const models =
      isRecord(payload) && Array.isArray(payload.models) ? payload.models : [];
    return models.filter(isRecord).map((m) => ({
      name: typeof m.name === "string" ? m.name : "",
      description: typeof m.description === "string" ? m.description : "",
      releaseDate: typeof m.release_date === "string" ? m.release_date : "",
    }));
  }
}
