import type { AIProviderName } from "../constants/enums.js";
import { CloudflareClefModels } from "../constants/enums.js";
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
  isRecord,
  redactCredentials,
  SystemOneDecisionProvider,
} from "./systemOneDecision.js";

const CLOUDFLARE_DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";
const MODEL_PREFIX = "@cf/cloudflare/";

/**
 * Cloudflare account ids are 32 hex digits. The pattern is wider so that a
 * change of format needs no release, but it still keeps `/`, `.`, `?` and
 * whitespace out of the URL path the id is placed in.
 */
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The only image formats the API reads; anything else is a 422. */
const SUPPORTED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/**
 * The uuid Workers AI appends to an `AiError` message, in parentheses. It starts
 * at a literal `(`, with no leading `\s*`: that one backtracks quadratically on
 * a long run of spaces, and the message is whatever the server sent.
 */
const TRAILING_REQUEST_ID =
  /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$/i;

const MAX_ERROR_MESSAGE_CHARS = 500;

/**
 * An error message is cut to this before any pattern runs on it, so a hostile or
 * garbled body cannot hold the event loop. Cloudflare's own messages are far
 * shorter (the longest seen was about 350 characters).
 */
const MAX_PARSED_MESSAGE_CHARS = 4096;

function normalizeBaseURL(raw: string): string {
  return raw.replace(/\/+$/, "");
}

/**
 * A base URL that cannot work is refused up front; see
 * {@link decisionBaseURLProblem}.
 */
function baseURLProblem(baseURL: string): string | undefined {
  return decisionBaseURLProblem(
    baseURL,
    "Cloudflare",
    `Set CLOUDFLARE_CLEF_BASE_URL or pass credentials.cloudflareClef.baseURL to a base URL, or leave both unset to use ${CLOUDFLARE_DEFAULT_BASE_URL}.`,
  );
}

/**
 * The name Cloudflare wants in the path and the body: `clef` or `clef-flash`,
 * given either bare or as `@cf/cloudflare/clef`. Anything with a `/` in it is
 * refused, so a model name cannot reach a different route.
 */
function wireModel(model: string): string | undefined {
  const bare = model.trim().replace(/^@cf\/cloudflare\//i, "");
  return /^[a-z0-9][a-z0-9._-]*$/i.test(bare) ? bare.toLowerCase() : undefined;
}

/**
 * Why this image cannot be sent, or undefined when it can. The data URL is
 * never repeated: it is megabytes of base64. Size limits are left to the
 * server, which refuses an oversized image at once with a clear 422.
 */
function imageProblem(dataUrl: string, position: number): string | undefined {
  const type = /^data:([a-z]+\/[a-z0-9.+-]+);base64,/i
    .exec(dataUrl)?.[1]
    ?.toLowerCase();
  return type && SUPPORTED_IMAGE_TYPES.has(type)
    ? undefined
    : `Image ${position} is not a PNG, JPEG or WebP image, the only formats Cloudflare Clef reads.`;
}

/** The API takes a string or structured data as `state`; a number or a boolean is sent as its text. */
function wireState(state: DecisionState): unknown {
  return typeof state === "number" || typeof state === "boolean"
    ? String(state)
    : state;
}

/**
 * `{"success":false,"errors":[{"code","message"}],...}` is Cloudflare's own
 * envelope. A model-side refusal nests a second one inside the message:
 * `AiError: AiError: {"error":{"message","details":{"fieldErrors":{...}}}} (<uuid>)`.
 * Both are flattened to one readable line, with the uuid taken out as the
 * request id. A body that is not this envelope reads as undefined and the
 * caller falls back to the status.
 */
function readCloudflareError(
  body: unknown,
): { message: string; code?: number; requestId?: string } | undefined {
  if (!isRecord(body) || !Array.isArray(body.errors)) {
    return undefined;
  }
  const first = body.errors.find(isRecord);
  if (!first || typeof first.message !== "string" || first.message === "") {
    return undefined;
  }
  let text = first.message.slice(0, MAX_PARSED_MESSAGE_CHARS).trimEnd();
  let requestId: string | undefined;
  const trailing = TRAILING_REQUEST_ID.exec(text);
  if (trailing) {
    requestId = trailing[1];
    text = text.slice(0, trailing.index).trimEnd();
  }
  text = text.replace(/^(?:AiError:\s*|Ai:\s*)+/, "").trim();
  if (text.startsWith("{")) {
    try {
      const inner: unknown = JSON.parse(text);
      if (isRecord(inner) && isRecord(inner.error)) {
        const details = isRecord(inner.error.details)
          ? inner.error.details
          : undefined;
        const fields = isRecord(details?.fieldErrors)
          ? Object.entries(details.fieldErrors).flatMap(([field, problems]) =>
              Array.isArray(problems)
                ? problems
                    .filter((p): p is string => typeof p === "string")
                    .map((p) => `${field}: ${p}`)
                : [],
            )
          : [];
        const head =
          typeof inner.error.message === "string" ? inner.error.message : text;
        text = fields.length > 0 ? `${head}: ${fields.join("; ")}` : head;
      }
    } catch {
      // not JSON after all; keep the text as it is
    }
  }
  return {
    message: text,
    code: typeof first.code === "number" ? first.code : undefined,
    requestId,
  };
}

/**
 * Only 401 is `authentication`, and so only 401 trips the breaker: Cloudflare
 * answered a token it does not know with a 401 and code 10000 (seen live). A 403
 * was never seen, and no such token was available to provoke one; if Cloudflare
 * uses it for a token that lacks Workers AI permission, that is fixed in the
 * dashboard, and a breaker that latched on it would keep this instance disabled
 * until the process restarted, even after the permission was granted. So a 403
 * is a non-retried `invalid_request` that carries Cloudflare's own message. A
 * request over the context window is a 413, code 5021, and a 429 is "Capacity
 * temporarily exceeded" (code 3040, no Retry-After), which is retryable.
 * Validation refusals are 422, and a malformed body or a wrong route is a 400;
 * none of those is retried.
 */
function cloudflareErrorKind(
  status: number,
  code: number | undefined,
): DecisionErrorKind {
  if (status === 401) {
    return "authentication";
  }
  if (status === 413 || code === 5021) {
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
 * Cloudflare Clef — the `decide` inference type only.
 *
 * `@cf/cloudflare/clef` (27B) and `@cf/cloudflare/clef-flash` (9B) answer the
 * same typed `noul` / `choice` / `score` questions as the other decision
 * providers, follow the System One wire, and read images. They are reached
 * through the Workers AI REST API, which wraps every answer in Cloudflare's own
 * `{ result, success, errors }` envelope and puts the model in the URL path.
 *
 * The token and account id are the ones the Cloudflare Workers AI text provider
 * reads (`CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`), so a host that has
 * configured that provider has also configured this one.
 *
 * The Workers AI endpoint ignores text past about 2,048 tokens, far below
 * the documented 64K (hosted service or model: unknown). See `decisionLimits`
 * on the descriptor for the measured figures.
 *
 * @see https://developers.cloudflare.com/workers-ai/models/clef/
 */
export class CloudflareClefProvider extends SystemOneDecisionProvider {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["cloudflareClef"],
  ) {
    super(modelName, "cloudflare-clef" as AIProviderName, sdk);
    // A slice that names its own base URL must bring its own token: the shared
    // CLOUDFLARE_API_KEY also runs the host's Workers AI text provider, and it
    // must never be sent as a bearer token to an endpoint a caller chose.
    const ownEndpoint = Boolean(credentials?.baseURL?.trim());
    this.apiKey =
      credentials?.apiKey?.trim() ||
      (ownEndpoint ? "" : (process.env.CLOUDFLARE_API_KEY?.trim() ?? ""));
    this.accountId =
      credentials?.accountId?.trim() ||
      (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "");
    // `||`, not `??`, so a blank override counts as unset.
    this.baseURL = normalizeBaseURL(
      credentials?.baseURL?.trim() ||
        process.env.CLOUDFLARE_CLEF_BASE_URL?.trim() ||
        CLOUDFLARE_DEFAULT_BASE_URL,
    );

    // A base URL that `baseURLProblem` refuses is not logged at all: it can
    // carry `user:pass@` or a `?token=`.
    logger.debug(
      "Cloudflare Clef decision provider initialized (decide only)",
      {
        modelName: this.modelName,
        baseURL: describeDecisionBaseURLForLog(
          this.baseURL,
          baseURLProblem(this.baseURL),
        ),
        accountConfigured: this.accountId !== "",
      },
    );
  }

  protected getDefaultModel(): string {
    return getProviderModel("CLOUDFLARE_CLEF_MODEL", CloudflareClefModels.CLEF);
  }

  protected vendorLabel(): string {
    return "Cloudflare";
  }

  protected vendorDisplayName(): string {
    return "Cloudflare Clef";
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return "Cloudflare Clef requires an API token with Workers AI permission. Set CLOUDFLARE_API_KEY or pass credentials.cloudflareClef.apiKey.";
  }

  protected override missingConfigMessage(): string | undefined {
    if (this.accountId === "") {
      return "Cloudflare Clef requires the account id. Set CLOUDFLARE_ACCOUNT_ID or pass credentials.cloudflareClef.accountId.";
    }
    if (!ACCOUNT_ID_PATTERN.test(this.accountId)) {
      return "The Cloudflare account id may contain only letters, digits, '-' and '_'. Copy it from the Cloudflare dashboard.";
    }
    return baseURLProblem(this.baseURL);
  }

  /** The model is part of the path, so the endpoint depends on the model asked for. */
  protected override decisionEndpoint(model: string): string {
    return `${this.baseURL}/accounts/${encodeURIComponent(this.accountId)}/ai/run/${MODEL_PREFIX}${encodeURIComponent(wireModel(model) ?? model)}`;
  }

  protected decisionHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Images travel in their own `images` array, as `data:` URLs, placed before
   * the state by the server. `model` is sent although the path already names
   * it: the API documents it as required, and refuses a body whose `model`
   * differs from the path.
   */
  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
    media?: DecisionPreparedMedia,
  ): Record<string, unknown> {
    const wire = wireModel(model);
    if (!wire) {
      throw this.decisionError({
        kind: "invalid_request",
        message: `"${model.slice(0, 40)}" is not a Cloudflare model name. Use "clef" or "clef-flash".`,
        retryable: false,
      });
    }
    // Workers AI also accepts image/jpg; use the canonical JPEG MIME type.
    const images = (media?.images ?? []).map((dataUrl) =>
      dataUrl.replace(/^data:image\/jpg;base64,/i, "data:image/jpeg;base64,"),
    );
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
    // The canonical JPEG prefix is one byte longer than image/jpg. Keep the
    // prepared media metadata aligned with the URLs actually sent.
    if (media) {
      media.images = images;
      media.bytes = images.reduce(
        (total, image) => total + Buffer.byteLength(image),
        0,
      );
    }
    return {
      model: wire,
      state: wireState(state),
      questions,
      ...(images.length > 0 ? { images } : {}),
    };
  }

  /** A success is `{ result: { model, answers, usage }, success: true }`. */
  protected override readDecisionPayload(payload: unknown): unknown {
    return isRecord(payload) && isRecord(payload.result)
      ? payload.result
      : payload;
  }

  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    const fallback = `Cloudflare request failed with HTTP ${status}`;
    const parsed = readCloudflareError(payload);
    const kind = cloudflareErrorKind(status, parsed?.code);
    let message =
      redactCredentials(parsed?.message ?? fallback, this.apiKey)
        .trim()
        .slice(0, MAX_ERROR_MESSAGE_CHARS) || fallback;
    if (kind === "max_tokens_exceeded") {
      message +=
        " Cloudflare counts the whole request, image data included, at about four characters per token.";
    } else if (parsed?.code === 7000) {
      message += `. Check the model name (Clef is served as "clef" and "clef-flash") and the base URL, which must end in /client/v4 and name your account.`;
    }
    return {
      kind,
      message,
      status,
      requestId: requestId ?? parsed?.requestId,
      retryable:
        kind === "rate_limit" || kind === "overloaded" || kind === "server",
    };
  }

  /**
   * `cf-ai-req-id` is on every answer that reached the model, success or
   * refusal. A 401 and a wrong-path 400 never reach it, so they carry only the
   * edge's `cf-ray`.
   */
  protected readRequestId(headers: Headers): string | undefined {
    return headers.get("cf-ai-req-id") ?? headers.get("cf-ray") ?? undefined;
  }
}
