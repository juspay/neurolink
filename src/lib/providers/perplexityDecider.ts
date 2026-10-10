import type { AIProviderName } from "../constants/enums.js";
import { PerplexityDeciderModels } from "../constants/enums.js";
import type {
  DecisionError,
  DecisionErrorKind,
  DecisionImageDimensions,
  DecisionPreparedMedia,
  DecisionState,
  NeurolinkCredentials,
} from "../types/index.js";
import { sniffImageMimeType } from "../utils/imageDetection.js";
import { logger } from "../utils/logger.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  decisionBaseURLProblem,
  describeDecisionBaseURLForLog,
  isRecord,
  redactCredentials,
  SystemOneDecisionProvider,
} from "./systemOneDecision.js";

const PERPLEXITY_DEFAULT_BASE_URL = "https://api.perplexity.ai";
const PERPLEXITY_ROUTE = "/v1/decisions";
// The same attribution the Perplexity text provider sends (see
// configuredOpenAICompat.ts): Perplexity asks to identify NeuroLink on its own
// API host only, so a custom endpoint gets no such header.
const PERPLEXITY_API_HOST = "api.perplexity.ai";
const PERPLEXITY_INTEGRATION = "neurolink";

/** The only image formats the API reads; anything else is a 400. */
const SUPPORTED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const IMAGE_TILE_PIXELS = 32;
const MAX_IMAGE_TILES = 2048;

/**
 * Added to the descriptor's `decideMs` for each question. Latency follows the
 * question count as well as the state: 128 minimal questions took 8.9 s on a
 * 12,000-token request, about 65 ms for each after the first, so a request at
 * the 128-question cap would otherwise outlast a flat 10 s and be retried into
 * the same wait.
 */
const TIMEOUT_MS_PER_QUESTION = 100;

/**
 * The override is an origin, but the API's own documentation spells its server
 * as `https://api.perplexity.ai/v1`, and the route already carries `/v1`. Both
 * spellings reduce to the same base.
 */
function normalizeBaseURL(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/**
 * A base URL that cannot work is refused up front; see
 * {@link decisionBaseURLProblem}.
 */
function baseURLProblem(baseURL: string): string | undefined {
  return decisionBaseURLProblem(
    baseURL,
    "Perplexity",
    `Set PERPLEXITY_DECIDER_BASE_URL or pass credentials.perplexityDecider.baseURL to an origin, or leave both unset to use ${PERPLEXITY_DEFAULT_BASE_URL}.`,
  );
}

function isPerplexityApiHost(baseURL: string): boolean {
  try {
    return new URL(baseURL).hostname === PERPLEXITY_API_HOST;
  } catch {
    return false;
  }
}

/**
 * The model server answers input past its limit with a 400, not the 413 the
 * gateway documents, so the kind comes from the text. `error.code` cannot be
 * used: it is a string, a number or null depending on which layer answered.
 *
 * The wording depends on what was sent. Text alone is refused with "Input
 * length (262144) exceeds or equals model's maximum context length (262144)",
 * the figure in brackets being the limit and not the size sent; a request with
 * images is refused with "Total input tokens (A text + B vision = C) exceeds
 * maximum context length (262144)". Both are matched.
 */
const OVER_LENGTH_MESSAGE =
  /exceeds(?: or equals)?(?: model's)? maximum context length/i;

/**
 * Only 401 is `authentication`, and so only 401 trips the breaker. Every other
 * 4xx is something the caller or an account owner can fix without restarting
 * the process, so it is a non-retried `invalid_request` rather than a latch.
 * A 5xx and a 504 (the model not answering in time) are retryable.
 */
function perplexityErrorKind(
  status: number,
  message: string,
): DecisionErrorKind {
  if (status === 401) {
    return "authentication";
  }
  if (status === 413 || (status === 400 && OVER_LENGTH_MESSAGE.test(message))) {
    return "max_tokens_exceeded";
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 503) {
    return "overloaded";
  }
  return status >= 500 ? "server" : "invalid_request";
}

/**
 * `{"error":{"message","type","code","param"}}`. A 404 and a 405 have an empty
 * body and a 504 can be an HTML page, so a body that is not that envelope reads
 * as undefined and the caller falls back to the status. `param` names the
 * offending field on some 400s.
 */
function readPerplexityErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error)) {
    return undefined;
  }
  const { message, param } = body.error;
  if (typeof message !== "string" || message.length === 0) {
    return undefined;
  }
  return typeof param === "string" && param !== "" && !message.includes(param)
    ? `${message} (field: ${param})`
    : message;
}

function readPngSize(bytes: Buffer): DecisionImageDimensions | undefined {
  return bytes.length >= 24 && bytes.toString("ascii", 12, 16) === "IHDR"
    ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
    : undefined;
}

/** Walks the marker segments to the first frame header (SOF0-SOF15). */
function readJpegSize(bytes: Buffer): DecisionImageDimensions | undefined {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return undefined;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
    } else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
    } else if (marker === 0xd9 || marker === 0xda) {
      return undefined;
    } else if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return offset + 9 <= bytes.length
        ? {
            height: bytes.readUInt16BE(offset + 5),
            width: bytes.readUInt16BE(offset + 7),
          }
        : undefined;
    } else {
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }
  return undefined;
}

function readWebpSize(bytes: Buffer): DecisionImageDimensions | undefined {
  if (bytes.length < 30) {
    return undefined;
  }
  switch (bytes.toString("ascii", 12, 16)) {
    case "VP8X":
      return {
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    case "VP8L": {
      const bits = bytes.readUInt32LE(21);
      return bytes[20] === 0x2f
        ? { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
        : undefined;
    }
    case "VP8 ":
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    default:
      return undefined;
  }
}

function readImageSize(bytes: Buffer): DecisionImageDimensions | undefined {
  switch (sniffImageMimeType(bytes)) {
    case "image/png":
      return readPngSize(bytes);
    case "image/jpeg":
      return readJpegSize(bytes);
    case "image/webp":
      return readWebpSize(bytes);
    default:
      return undefined;
  }
}

/**
 * Why this image cannot be sent, or undefined when it can. The data URL is
 * never repeated: it is megabytes of base64.
 *
 * The size check exists because the API does not refuse an oversized image: it
 * holds the request for about a minute and then answers 504. An image whose
 * dimensions cannot be read is sent as is.
 */
function imageProblem(dataUrl: string, position: number): string | undefined {
  const header = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i.exec(dataUrl);
  if (!header || !SUPPORTED_IMAGE_TYPES.has(header[1].toLowerCase())) {
    return `Image ${position} is not a PNG, JPEG or WebP image, the only formats Perplexity reads.`;
  }
  const size = readImageSize(
    Buffer.from(dataUrl.slice(header[0].length), "base64"),
  );
  if (!size) {
    return undefined;
  }
  const tiles =
    Math.round(size.width / IMAGE_TILE_PIXELS) *
    Math.round(size.height / IMAGE_TILE_PIXELS);
  return tiles > MAX_IMAGE_TILES
    ? `Image ${position} is ${size.width}x${size.height} pixels; Perplexity reads at most ${MAX_IMAGE_TILES} tiles of ${IMAGE_TILE_PIXELS}x${IMAGE_TILE_PIXELS} pixels per image (1440x1440 and 2048x1024 fit), and a larger one stalls until the request times out. Resize it first.`
    : undefined;
}

/**
 * The API takes a string, an object or an array as `state`, so a number or a
 * boolean is sent as its text.
 */
function wireState(state: DecisionState): unknown {
  return typeof state === "number" || typeof state === "boolean"
    ? String(state)
    : state;
}

/**
 * Perplexity Provider — the `decide` inference type only.
 *
 * `pplx-decider-v1-27b` answers the same typed `noul` / `choice` / `score`
 * questions as the other decision providers, in one batched pass, and also reads
 * images. It is a hosted API with a public endpoint, so unlike the self-hosted
 * providers it needs only a key. The request loop, retries, auth circuit
 * breaker and answer parsing are shared with every decision provider in
 * {@link SystemOneDecisionProvider}.
 *
 * The key is the same `PERPLEXITY_API_KEY` the Sonar text provider reads, so a
 * host that has configured that provider has also configured this one.
 *
 * @see https://docs.perplexity.ai/api-reference/decisions-post
 */
export class PerplexityDeciderProvider extends SystemOneDecisionProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["perplexityDecider"],
  ) {
    super(modelName, "perplexity-decider" as AIProviderName, sdk);
    this.apiKey =
      credentials?.apiKey?.trim() ||
      (process.env.PERPLEXITY_API_KEY?.trim() ?? "");
    // `||`, not `??`, so a blank override counts as unset.
    this.baseURL = normalizeBaseURL(
      credentials?.baseURL?.trim() ||
        process.env.PERPLEXITY_DECIDER_BASE_URL?.trim() ||
        PERPLEXITY_DEFAULT_BASE_URL,
    );

    // A base URL that `baseURLProblem` refuses is not logged at all: it can
    // carry `user:pass@` or a `?token=`.
    logger.debug("Perplexity decision provider initialized (decide only)", {
      modelName: this.modelName,
      baseURL: describeDecisionBaseURLForLog(
        this.baseURL,
        baseURLProblem(this.baseURL),
      ),
    });
  }

  protected getDefaultModel(): string {
    return getProviderModel(
      "PERPLEXITY_DECIDER_MODEL",
      PerplexityDeciderModels.PPLX_DECIDER_V1_27B,
    );
  }

  protected vendorLabel(): string {
    return "Perplexity";
  }

  protected vendorDisplayName(): string {
    return "Perplexity Decisions";
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return "Perplexity requires an API key. Set PERPLEXITY_API_KEY or pass credentials.perplexityDecider.apiKey.";
  }

  protected override missingConfigMessage(): string | undefined {
    return baseURLProblem(this.baseURL);
  }

  protected decisionEndpoint(): string {
    return `${this.baseURL}${PERPLEXITY_ROUTE}`;
  }

  protected decisionHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(isPerplexityApiHost(this.baseURL)
        ? { "X-Pplx-Integration": PERPLEXITY_INTEGRATION }
        : {}),
    };
  }

  /**
   * `model` is always sent: the API answers 400 to a request that names none.
   * Images travel inside `state`, which becomes an array of the caller's state
   * followed by one OpenAI-style `image_url` part per image; the API has no
   * separate images field and rejects unknown ones.
   */
  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
    media?: DecisionPreparedMedia,
  ): Record<string, unknown> {
    const images = media?.images ?? [];
    if (images.length === 0) {
      return { model, state: wireState(state), questions };
    }
    images.forEach((dataUrl, index) => {
      const problem = imageProblem(dataUrl, index + 1);
      if (problem) {
        throw this.decisionError({
          kind: "invalid_request",
          message: problem,
          retryable: false,
        });
      }
    });
    const content: readonly unknown[] = Array.isArray(state)
      ? state
      : state === ""
        ? []
        : [wireState(state)];
    return {
      model,
      state: [
        ...content,
        ...images.map((url) => ({ type: "image_url", image_url: { url } })),
      ],
      questions,
    };
  }

  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    const fallback = `Perplexity request failed with HTTP ${status}`;
    // Strip anything shaped like a Perplexity key as well as the configured
    // one. Keys carry `_` and `-`, so the class includes them. A key has 48
    // characters after the prefix, and the floor sits well under that but above
    // any model name: the 400 that rejects `pplx-decider-v1-27b-latest` has to
    // keep naming it.
    const message =
      redactCredentials(
        readPerplexityErrorMessage(payload) ?? fallback,
        this.apiKey,
      )
        .replace(/\bpplx-[A-Za-z0-9_-]{30,}/g, "[redacted]")
        .trim() || fallback;
    const kind = perplexityErrorKind(status, message);
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
   * A 401, a 404 and a 504 carry no request id, so this is undefined for them.
   */
  protected readRequestId(headers: Headers): string | undefined {
    return headers.get("x-request-id") ?? undefined;
  }

  protected override defaultTimeoutMs(
    questionCount: number,
  ): number | undefined {
    const allowance = this.getDescriptorDecideMs();
    return allowance === undefined
      ? undefined
      : allowance + questionCount * TIMEOUT_MS_PER_QUESTION;
  }

  /**
   * `Retry-After` is whole seconds on a 429, or an HTTP date. Anything else, a
   * zero and a date already past all read as undefined, so the retry takes the
   * default backoff instead of going out at once. `Number()` is not used: it
   * reads "0x10" as 16 and "1e3" as 1,000.
   */
  protected override readRetryAfterMs(headers: Headers): number | undefined {
    const raw = headers.get("retry-after")?.trim();
    if (!raw) {
      return undefined;
    }
    const ms = /^\d+$/.test(raw)
      ? Number(raw) * 1000
      : Date.parse(raw) - Date.now();
    return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms) : undefined;
  }
}
