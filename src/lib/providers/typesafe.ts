import type { AIProviderName } from "../constants/enums.js";
import { TypeSafeModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { ProviderError } from "../types/index.js";
import type {
  DecisionAnswer,
  DecisionError,
  DecisionErrorKind,
  DecisionModelCard,
  DecisionQuestion,
  DecisionRequest,
  DecisionResult,
  LanguageModel,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { getProviderModel } from "../utils/providerConfig.js";

const TYPESAFE_DEFAULT_BASE_URL = "https://api.typesafe.ai";

/**
 * Vercel AI Gateway's evaluation-model endpoint.
 *
 * Vercel's AI SDK models a decision model as `EvaluationModelV4`, separate
 * from `LanguageModelV4` — the same conclusion this codebase reached with
 * `inferenceKinds`, arrived at independently. The gateway therefore has its
 * own route rather than reusing the chat one.
 */
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v4/ai/evaluation-model";

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
 * Generous enough for a cold start (measured at 2.0–2.7s after idle) while
 * still bounded. Steady-state p50 is ~400ms, so this only bites on the first
 * call or a genuine stall — and every internal caller is fail-open anyway.
 */
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 1;

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

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const asNumberMap = (v: unknown): Record<string, number> | undefined => {
  if (!isRecord(v)) {
    return undefined;
  }
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(v)) {
    const n = asNumber(raw);
    if (n === undefined) {
      return undefined;
    }
    out[k] = n;
  }
  return out;
};

const asStringMap = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, raw] of Object.entries(v)) {
    if (typeof raw !== "string") {
      return undefined;
    }
    out[k] = raw;
  }
  return out;
};

/**
 * Translate the provider-neutral question vocabulary onto TypeSafe's wire.
 *
 * The only difference is the name of the yes/no primitive: TypeSafe calls it
 * `noul`, and everyone exposing it — the Vercel AI SDK, Pydantic AI, and this
 * codebase — calls it `boolean`. Vercel's AI Gateway fronts the same model
 * and uses the neutral name, so the gateway transport needs no translation
 * at all.
 */
function toWireQuestion(
  question: DecisionQuestion,
  transport: "direct" | "gateway",
): Record<string, unknown> {
  // The gateway already speaks the neutral vocabulary this codebase uses, so
  // only the direct transport needs the rename.
  if (question.type === "boolean" && transport === "direct") {
    return {
      type: "noul",
      instructions: question.instructions,
      ...(question.criteria ? { criteria: question.criteria } : {}),
    };
  }
  return question;
}

/**
 * Validate one answer off the wire. Returns null rather than throwing so a
 * single malformed answer degrades to "unanswered" instead of failing the
 * whole batch — the batch may hold hundreds of usable answers.
 */
function parseAnswer(
  raw: unknown,
  reportedConfidence?: number,
): DecisionAnswer | null {
  if (!isRecord(raw)) {
    return null;
  }
  switch (raw.type) {
    // "noul" is TypeSafe's own spelling; "boolean" is the gateway's, which
    // renames both the type and the field. Accepting both keeps one parser
    // for two transports — and keeps the direct path working if TypeSafe
    // ever adopts the neutral name itself.
    case "noul":
    case "boolean": {
      const probability = asNumber(raw.noul) ?? asNumber(raw.probability);
      return probability === undefined
        ? null
        : { type: "boolean", probability };
    }
    case "choice": {
      const probabilities = asNumberMap(raw.probabilities);
      if (typeof raw.choice !== "string" || !probabilities) {
        return null;
      }
      return {
        type: "choice",
        choice: raw.choice,
        confidence:
          asNumber(raw.confidence) ??
          reportedConfidence ??
          deriveConfidence(probabilities),
        probabilities,
      };
    }
    case "score": {
      const score = asNumber(raw.score);
      const legend = asStringMap(raw.legend);
      const probabilities = asNumberMap(raw.probabilities);
      if (score === undefined || !legend || !probabilities) {
        return null;
      }
      return {
        type: "score",
        score,
        confidence:
          asNumber(raw.confidence) ??
          reportedConfidence ??
          deriveConfidence(probabilities),
        legend,
        probabilities,
      };
    }
    default:
      return null;
  }
}

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
 * Last-resort confidence, when no transport reported one.
 *
 * The gateway leaves `confidence` off every answer object, so this was once
 * the only value a gateway caller ever saw. It is not: the gateway reports the
 * vendor's calibrated figure under `providerMetadata` (see
 * {@link readReportedConfidence}), which is preferred wherever it is present.
 * This remains the fallback for an answer neither source covers.
 *
 * The peak probability is what a calibrated confidence approximates, but it is
 * NOT the same number, so a threshold tuned against the direct transport does
 * not transfer unexamined; an even distribution lands near 1/N rather than 0.
 */
function deriveConfidence(probabilities: Record<string, number>): number {
  const values = Object.values(probabilities);
  return values.length > 0 ? Math.max(...values) : 0;
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
function parseError(
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
    const fields = detail
      .filter(isRecord)
      .map((d) => {
        const loc = Array.isArray(d.loc)
          ? d.loc
              .filter((p) => typeof p === "string" || typeof p === "number")
              .join(".")
          : "";
        const msg = typeof d.msg === "string" ? d.msg : "invalid";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .slice(0, 5);
    return {
      kind: "invalid_request",
      message: `Request failed validation — ${fields.join("; ") || "unspecified field"}`,
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * TypeSafe Provider — the `decide` inference type only.
 *
 * Jev is a "System One" model: it takes one `state` plus a map of typed
 * questions and returns one typed answer each, evaluated in a single
 * parallel pass. It emits no text, so `generate()` / `stream()` are not
 * available and `getAISDKModel()` throws — the same shape Voyage and Jina
 * already use for embedding-only providers.
 *
 * Its descriptor declares `inferenceKinds: ["decide"]`, which keeps it out
 * of auto-select and the health sweep, so those throws should be unreachable
 * in practice.
 *
 * Two measured properties shape the API: latency is flat in question count
 * (1 question 393ms, 400 questions 465ms) while concurrent requests queue.
 * Callers therefore batch every question into one `decide()` call.
 *
 * Two transports reach the same model. The direct one is TypeSafe's own API,
 * billed against a TypeSafe key. The gateway one is Vercel's AI Gateway
 * evaluation-model route, billed against a Vercel account — useful to a host
 * that already has one and does not want a second vendor relationship. They
 * differ on the wire (vocabulary, where the model is named, and whether
 * `confidence` is reported at all) and not at all in `DecisionResult`; the
 * one thing to know is that gateway confidence is DERIVED from the
 * probability distribution rather than being the vendor's calibrated figure,
 * so a threshold tuned on one transport should be re-checked on the other.
 *
 * @see https://docs.typesafe.ai/api
 */
export class TypeSafeProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;
  private readonly maxRetries: number;

  /** Which wire this instance speaks. Resolved once, in the constructor. */
  private readonly transport: "direct" | "gateway";

  /**
   * Set once the key has been rejected. A bad key cannot fix itself, and
   * without this every later request would pay a full round trip (~265ms
   * measured) to be told so again — a permanent tax on the hot path for a
   * misconfiguration.
   */
  private authFailed = false;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["typesafe"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "typesafe" as AIProviderName, validatedNeurolink);

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
    this.proxyFetch = createProxyFetch();
    this.maxRetries = DEFAULT_MAX_RETRIES;

    logger.debug("TypeSafe Provider initialized (decide only)", {
      modelName: this.modelName,
      transport: this.transport,
      baseURL: this.transport === "gateway" ? GATEWAY_URL : this.baseURL,
    });
  }

  // ===== Required abstract overrides =====

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getProviderModel("TYPESAFE_MODEL", TypeSafeModels.JEV_LATEST);
  }

  protected override getDefaultDecisionModel(): string | undefined {
    return this.getDefaultModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  /**
   * Jev produces no text, so there is no chat model behind this provider.
   * Unreachable while the descriptor declares `inferenceKinds: ["decide"]`;
   * kept actionable for the case where something routes here anyway.
   */
  protected getAISDKModel(): LanguageModel {
    throw new ProviderError(
      "TypeSafe (Jev) is a decision-only provider; it generates no text, so chat completions are not available. Use `decide()` instead, or pick a different provider for `generate()` / `stream()`.",
      "typesafe",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new ProviderError(
      "TypeSafe (Jev) is a decision-only provider; streaming is not available. Use `decide()`, or pick another provider for `stream()`.",
      "typesafe",
    );
  }

  /**
   * Must RETURN the error, never throw it (CLAUDE.md rule 6).
   */
  protected formatProviderError(error: unknown): Error {
    if (error instanceof ProviderError) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new ProviderError(`TypeSafe request failed: ${message}`, "typesafe");
  }

  // ===== The decide inference type =====

  /**
   * Evaluate a state against a batch of typed questions.
   *
   * Throws a {@link ProviderError} carrying a normalised {@link DecisionError}
   * in `cause`. Internal hot paths should prefer `NeuroLink.tryDecide()`,
   * which returns null instead.
   */
  override async decide(request: DecisionRequest): Promise<DecisionResult> {
    if (!this.apiKey) {
      throw this.decisionError({
        kind: "authentication",
        message:
          this.transport === "gateway"
            ? "The TypeSafe gateway transport requires a Vercel AI Gateway key. Set AI_GATEWAY_API_KEY or pass credentials.typesafe.gatewayApiKey."
            : "TypeSafe requires an API key. Set TYPESAFE_API_KEY or pass credentials.typesafe.apiKey.",
        retryable: false,
      });
    }
    if (this.authFailed) {
      throw this.decisionError({
        kind: "authentication",
        message:
          "TypeSafe rejected this API key earlier; not retrying. Fix the key and construct a new provider.",
        retryable: false,
      });
    }

    const questionEntries = Object.entries(request.questions);
    if (questionEntries.length === 0) {
      throw this.decisionError({
        kind: "invalid_request",
        message: "At least one question is required.",
        retryable: false,
      });
    }

    const wireQuestions = Object.fromEntries(
      questionEntries.map(([id, question]) => [
        id,
        toWireQuestion(question, this.transport),
      ]),
    );
    const resolvedModel =
      request.model ?? this.modelName ?? this.getDefaultModel();
    // The gateway names the model in a header and rejects a body that carries
    // one; the direct API requires it in the body.
    const body = JSON.stringify(
      this.transport === "gateway"
        ? { state: request.state, questions: wireQuestions }
        : {
            model: resolvedModel,
            state: request.state,
            questions: wireQuestions,
          },
    );

    const timeoutMs =
      request.timeoutMs ??
      this.getDescriptorDecideMs() ??
      this.defaultTimeout ??
      DEFAULT_TIMEOUT_MS;

    let lastError: DecisionError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const startedAt = Date.now();
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const signal = request.signal
          ? AbortSignal.any([request.signal, timeout])
          : timeout;

        const response = await this.proxyFetch(this.endpoint(), {
          method: "POST",
          headers: this.headers(),
          body,
          signal,
        });

        const latencyMs = Date.now() - startedAt;
        const requestId =
          response.headers.get("x-typesafe-request-id") ?? undefined;
        const upstreamMs =
          Number(response.headers.get("x-envoy-upstream-service-time")) ||
          undefined;
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          lastError = parseError(response.status, payload, requestId);
          if (lastError.kind === "authentication") {
            this.authFailed = true;
            // The breaker is right to trip — none of these clear themselves
            // inside one process — but it must not assert WHICH credential
            // problem it was. A gateway 403 with a valid key and no card on
            // file is not a rejected key, and saying so sends the reader off
            // to regenerate the one thing that works.
            logger.warn(
              `TypeSafe: credential not accepted — disabling this provider instance. ${lastError.message}`,
              {
                status: lastError.status,
                transport: this.transport,
                requestId,
              },
            );
          }
          if (!lastError.retryable || attempt === this.maxRetries) {
            throw this.decisionError(lastError);
          }
          await sleep(2 ** attempt * 250 + Math.random() * 250);
          continue;
        }

        if (!isRecord(payload) || !isRecord(payload.answers)) {
          throw this.decisionError({
            kind: "server",
            message: "TypeSafe returned a response without an answers map.",
            status: response.status,
            requestId,
            retryable: false,
          });
        }

        // The gateway does not omit confidence after all — it RELOCATES it,
        // to `providerMetadata.typesafe.confidence.<questionId>`, and leaves
        // the answer objects themselves without one. Preferring it over the
        // derived peak matters because the two disagree on any distribution
        // that is not already near-certain, and the router's asymmetric bars
        // are tuned against the vendor's calibrated figure, not against
        // max(probabilities).
        const reported = readReportedConfidence(payload);

        const answers: Record<string, DecisionAnswer> = {};
        for (const [id, raw] of Object.entries(payload.answers)) {
          const parsed = parseAnswer(raw, reported[id]);
          if (parsed) {
            answers[id] = parsed;
          } else {
            logger.warn(`TypeSafe: dropped unparseable answer "${id}"`, {
              requestId,
            });
          }
        }

        const usage = isRecord(payload.usage) ? payload.usage : {};
        return {
          // `resolvedModel`, not `this.modelName`: when the caller pinned a
          // model for this one request and the response omits its own, the
          // instance default would be reported instead of the model actually
          // asked for.
          model:
            typeof payload.model === "string" ? payload.model : resolvedModel,
          provider: this.providerName,
          answers,
          // Two spellings for one field. The direct API sends `input_tokens`;
          // the gateway sends `inputTokens`. Reading only the first meant every
          // gateway decision reported zero tokens — and since decisions are
          // priced on input alone, every gateway decision was also costed at
          // exactly $0, silently, in both the span attributes and the cost
          // aggregate. Nothing failed; the number was simply always zero.
          usage: {
            inputTokens:
              asNumber(usage.input_tokens) ?? asNumber(usage.inputTokens) ?? 0,
            outputTokens:
              asNumber(usage.output_tokens) ??
              asNumber(usage.outputTokens) ??
              0,
          },
          requestId,
          latencyMs,
          upstreamMs,
        };
      } catch (error) {
        if (error instanceof ProviderError) {
          throw error;
        }
        // An abort from the caller's own signal must not be retried — the
        // turn is already being torn down.
        const aborted = request.signal?.aborted === true;
        const isTimeout =
          error instanceof Error && error.name === "TimeoutError";
        lastError = {
          kind: aborted ? "network" : isTimeout ? "timeout" : "network",
          message: error instanceof Error ? error.message : String(error),
          retryable: !aborted,
        };
        if (aborted || attempt === this.maxRetries) {
          throw this.decisionError(lastError);
        }
        await sleep(2 ** attempt * 250 + Math.random() * 250);
      }
    }

    throw this.decisionError(
      lastError ?? {
        kind: "network",
        message: "TypeSafe request failed.",
        retryable: false,
      },
    );
  }

  /** Where a decision request goes for this instance's transport. */
  private endpoint(): string {
    return this.transport === "gateway"
      ? GATEWAY_URL
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
  private headers(): Record<string, string> {
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
      signal: AbortSignal.timeout(this.defaultTimeout ?? DEFAULT_TIMEOUT_MS),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw this.decisionError(
        parseError(
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

  /**
   * Wrap a normalised decision failure in the provider error type, keeping
   * the structured detail reachable via `cause` for callers that branch on
   * `kind` (authentication vs rate_limit vs max_tokens_exceeded).
   */
  private decisionError(detail: DecisionError): ProviderError {
    const error = new ProviderError(detail.message, "typesafe");
    Object.defineProperty(error, "cause", {
      value: detail,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    return error;
  }
}
