import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { PROVIDER_DESCRIPTORS_BY_NAME } from "../factories/providerDescriptors.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { ProviderError } from "../types/index.js";
import type {
  DecisionAnswer,
  DecisionError,
  DecisionQuestion,
  DecisionRequest,
  DecisionResult,
  DecisionState,
  LanguageModel,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  estimateTokens,
  serializeForEstimate,
} from "../utils/tokenEstimation.js";

/**
 * Generous enough for a cold start (measured at 2.0–2.7s after idle on Jev)
 * while still bounded. Every internal caller is fail-open, so this only bites
 * on a genuine stall.
 */
export const DEFAULT_DECISION_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 1;

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const asNumber = (v: unknown): number | undefined =>
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
 * Last-resort confidence, when no transport reported one.
 *
 * The peak probability is what a calibrated confidence approximates, but it is
 * NOT the same number, so a threshold tuned against a vendor's calibrated
 * figure does not transfer unexamined; an even distribution lands near 1/N
 * rather than 0.
 */
function deriveConfidence(probabilities: Record<string, number>): number {
  const values = Object.values(probabilities);
  return values.length > 0 ? Math.max(...values) : 0;
}

/**
 * Validate one answer off the wire. Returns null rather than throwing so a
 * single malformed answer degrades to "unanswered" instead of failing the
 * whole batch — the batch may hold hundreds of usable answers.
 */
function parseDecisionAnswer(
  raw: unknown,
  reportedConfidence?: number,
): DecisionAnswer | null {
  if (!isRecord(raw)) {
    return null;
  }
  switch (raw.type) {
    // "noul" is the System One wire's own spelling; "boolean" is the neutral
    // one (Vercel's gateway), which renames both the type and the field.
    // Accepting both keeps one parser for every transport.
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
 * FastAPI's request-validation envelope, `{"detail":[{loc, msg, input}]}`,
 * reduced to its field paths and messages. `input` echoes the caller's own
 * request back — possibly the whole state — so it is never surfaced.
 */
export function describeValidationErrors(detail: readonly unknown[]): string {
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
  return fields.join("; ") || "unspecified field";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `estimateTokens` assumes ~4 characters per token. That holds for English
 * and is several times too generous for other scripts on an English
 * tokenizer, so when a provider declares a rate, non-ASCII characters are
 * counted at it instead. ASCII text is estimated exactly as before.
 */
function estimateDecisionStateTokens(
  text: string,
  nonAsciiTokensPerChar: number | undefined,
): number {
  if (nonAsciiTokensPerChar === undefined) {
    return estimateTokens(text);
  }
  const chars = [...text];
  const isAscii = (c: string) => (c.codePointAt(0) ?? 0) <= 0x7f;
  const ascii = chars.filter(isAscii).join("");
  const nonAsciiCount = chars.length - ascii.length;
  return (
    estimateTokens(ascii) + Math.ceil(nonAsciiCount * nonAsciiTokensPerChar)
  );
}

/**
 * The shared half of every "System One" decision provider — a model that takes
 * one `state` plus typed questions and returns one typed answer each, with no
 * text anywhere.
 *
 * Vendors differ in where the request goes, how it is authenticated, what the
 * body carries and what their error envelopes look like. They do not differ in
 * anything else, so everything else lives here: the missing-key check, the
 * auth circuit breaker, the timeout and retry loop, answer parsing and usage.
 * A new decision provider implements the abstract hooks and nothing more.
 */
export abstract class SystemOneDecisionProvider extends BaseProvider {
  protected readonly proxyFetch: typeof fetch;
  private readonly maxRetries: number;

  /**
   * Set once the key has been rejected. A bad key cannot fix itself, and
   * without this every later request would pay a full round trip (~265ms
   * measured on Jev) to be told so again — a permanent tax on the hot path for
   * a misconfiguration.
   */
  private authFailed = false;

  protected constructor(
    modelName: string | undefined,
    providerName: AIProviderName,
    sdk: unknown,
  ) {
    super(modelName, providerName, isNeuroLink(sdk) ? sdk : undefined);
    this.proxyFetch = createProxyFetch();
    this.maxRetries = DEFAULT_MAX_RETRIES;
  }

  // ===== Vendor hooks =====

  /** Short vendor name for messages and logs, e.g. "TypeSafe". */
  protected abstract vendorLabel(): string;
  /** How the model is named when describing it, e.g. "TypeSafe (Jev)". */
  protected abstract vendorDisplayName(): string;
  protected abstract decisionApiKey(): string;
  protected abstract missingKeyMessage(): string;
  /**
   * Why this instance cannot send a request even though it has a key, such as
   * a provider with no built-in endpoint and none configured. Undefined when
   * nothing is missing.
   */
  protected missingConfigMessage(): string | undefined {
    return undefined;
  }
  protected abstract decisionEndpoint(): string;
  protected abstract decisionHeaders(): Record<string, string>;
  protected abstract buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
  ): Record<string, unknown>;
  protected abstract parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError;
  protected abstract readRequestId(headers: Headers): string | undefined;

  /**
   * The System One wire calls the yes/no primitive `noul`; this codebase and
   * every SDK exposing it call it `boolean`.
   */
  protected encodeQuestion(
    question: DecisionQuestion,
  ): Record<string, unknown> {
    if (question.type === "boolean") {
      return {
        type: "noul",
        instructions: question.instructions,
        ...(question.criteria ? { criteria: question.criteria } : {}),
      };
    }
    return question;
  }

  /** Per-question confidence a transport reports outside the answer objects. */
  protected reportedConfidence(_payload: unknown): Record<string, number> {
    return {};
  }

  protected resolveResponseModel(
    payload: Record<string, unknown>,
    requestedModel: string,
  ): string {
    return typeof payload.model === "string" ? payload.model : requestedModel;
  }

  /** Extra fields for the credential-rejected warning. */
  protected diagnosticContext(): Record<string, unknown> {
    return {};
  }

  // ===== BaseProvider obligations a text-less model satisfies identically =====

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected override getDefaultDecisionModel(): string | undefined {
    return this.getDefaultModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  /**
   * A decision model produces no text, so there is no chat model behind it.
   * Unreachable while the descriptor declares `inferenceKinds: ["decide"]`;
   * kept actionable for the case where something routes here anyway.
   */
  protected getAISDKModel(): LanguageModel {
    throw new ProviderError(
      `${this.vendorDisplayName()} is a decision-only provider; it generates no text, so chat completions are not available. Use \`decide()\` instead, or pick a different provider for \`generate()\` / \`stream()\`.`,
      this.providerName,
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new ProviderError(
      `${this.vendorDisplayName()} is a decision-only provider; streaming is not available. Use \`decide()\`, or pick another provider for \`stream()\`.`,
      this.providerName,
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
    return new ProviderError(
      `${this.vendorLabel()} request failed: ${message}`,
      this.providerName,
    );
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
    const label = this.vendorLabel();
    if (!this.decisionApiKey()) {
      throw this.decisionError({
        kind: "authentication",
        message: this.missingKeyMessage(),
        retryable: false,
      });
    }
    const missingConfig = this.missingConfigMessage();
    if (missingConfig) {
      throw this.decisionError({
        kind: "invalid_request",
        message: missingConfig,
        retryable: false,
      });
    }
    if (this.authFailed) {
      throw this.decisionError({
        kind: "authentication",
        message: `${label} rejected this API key earlier; not retrying. Fix the key and construct a new provider.`,
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

    const resolvedModel =
      request.model ?? this.modelName ?? this.getDefaultModel();
    this.assertWithinDecisionLimits(
      request,
      resolvedModel,
      questionEntries.length,
    );
    const wireQuestions = Object.fromEntries(
      questionEntries.map(([id, question]) => [
        id,
        this.encodeQuestion(question),
      ]),
    );
    const body = JSON.stringify(
      this.buildDecisionBody(request.state, wireQuestions, resolvedModel),
    );

    const timeoutMs =
      request.timeoutMs ??
      this.getDescriptorDecideMs() ??
      this.defaultTimeout ??
      DEFAULT_DECISION_TIMEOUT_MS;

    let lastError: DecisionError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const startedAt = Date.now();
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const signal = request.signal
          ? AbortSignal.any([request.signal, timeout])
          : timeout;

        const response = await this.proxyFetch(this.decisionEndpoint(), {
          method: "POST",
          headers: this.decisionHeaders(),
          body,
          signal,
        });

        const latencyMs = Date.now() - startedAt;
        const requestId = this.readRequestId(response.headers);
        const upstreamMs =
          Number(response.headers.get("x-envoy-upstream-service-time")) ||
          undefined;
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          lastError = this.parseDecisionError(
            response.status,
            payload,
            requestId,
          );
          if (lastError.kind === "authentication") {
            this.authFailed = true;
            // The breaker is right to trip — none of these clear themselves
            // inside one process — but it must not assert WHICH credential
            // problem it was. A gateway 403 with a valid key and no card on
            // file is not a rejected key, and saying so sends the reader off
            // to regenerate the one thing that works.
            logger.warn(
              `${label}: credential not accepted — disabling this provider instance. ${lastError.message}`,
              {
                status: lastError.status,
                ...this.diagnosticContext(),
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
            message: `${label} returned a response without an answers map.`,
            status: response.status,
            requestId,
            retryable: false,
          });
        }

        const reported = this.reportedConfidence(payload);

        const answers: Record<string, DecisionAnswer> = {};
        for (const [id, raw] of Object.entries(payload.answers)) {
          const parsed = parseDecisionAnswer(raw, reported[id]);
          if (parsed) {
            answers[id] = parsed;
          } else {
            logger.warn(`${label}: dropped unparseable answer "${id}"`, {
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
          model: this.resolveResponseModel(payload, resolvedModel),
          provider: this.providerName,
          answers,
          // Two spellings for one field. The System One wire sends
          // `input_tokens`; Vercel's gateway sends `inputTokens`. Reading only
          // the first priced every gateway decision at exactly $0, silently.
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
        message: `${label} request failed.`,
        retryable: false,
      },
    );
  }

  /**
   * Refuse a request the model cannot read in full. An encoder cuts the state
   * off past its window without saying so, so without this a decision would
   * be made on input the model never saw — and reported as if it had.
   */
  private assertWithinDecisionLimits(
    request: DecisionRequest,
    model: string,
    questionCount: number,
  ): void {
    const limits = PROVIDER_DESCRIPTORS_BY_NAME.get(
      this.providerName,
    )?.decisionLimits;
    if (!limits) {
      return;
    }
    const label = this.vendorLabel();
    if (questionCount > limits.maxQuestions) {
      throw this.decisionError({
        kind: "max_tokens_exceeded",
        message: `${label} accepts at most ${limits.maxQuestions} questions per request; this one has ${questionCount}. Ask fewer, or use a decision provider without this cap.`,
        retryable: false,
      });
    }
    const modelLimits = limits.models?.[model];
    const maxStateTokens = modelLimits?.maxStateTokens ?? limits.maxStateTokens;
    const stateTokens = estimateDecisionStateTokens(
      serializeForEstimate(request.state),
      modelLimits?.nonAsciiTokensPerChar ?? limits.nonAsciiTokensPerChar,
    );
    if (stateTokens > maxStateTokens) {
      throw this.decisionError({
        kind: "max_tokens_exceeded",
        message: `The state is ~${stateTokens} tokens; ${label}'s "${model}" model reads at most ${maxStateTokens}. Shorten the state, or use a decision provider with a larger window.`,
        retryable: false,
      });
    }
  }

  /**
   * Wrap a normalised decision failure in the provider error type, keeping
   * the structured detail reachable via `cause` for callers that branch on
   * `kind` (authentication vs rate_limit vs max_tokens_exceeded).
   */
  protected decisionError(detail: DecisionError): ProviderError {
    const error = new ProviderError(detail.message, this.providerName);
    Object.defineProperty(error, "cause", {
      value: detail,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    return error;
  }
}
