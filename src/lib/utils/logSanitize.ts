/**
 * Shared log-sanitization helpers.
 *
 * Centralises truncate + secret-redaction patterns so every provider stays
 * consistent and any regex improvements only need one change.
 *
 * Coverage:
 *   - `Authorization: Bearer <token>` (with required whitespace)
 *   - `Authorization: Token <token>` (Replicate uses this, not Bearer)
 *   - `Authorization: Basic <base64>` (D-ID and similar)
 *   - Bare tokens by known provider prefix:
 *     sk-/pk- (OpenAI, Anthropic, Stability),
 *     r8_ (Replicate), gsk_ (Groq), xai- (xAI), tgp_ (Together),
 *     fw_ (Fireworks), pplx- (Perplexity), pa- (Voyage),
 *     jina_ (Jina), fish- (Fish Audio)
 *   - Generic key=value pairs: api_key=…, access_token: …, secret_key=…
 */

import { basename, resolve as resolvePath } from "path";

const TOKEN_PREFIXES = [
  "sk",
  "pk",
  "r8",
  "gsk",
  "xai",
  "tgp",
  "fw",
  "pplx",
  "pa",
  "jina",
  "fish",
] as const;

const PREFIX_PATTERN = TOKEN_PREFIXES.join("|");

/**
 * Pattern matching common bearer/API-key tokens in plain text.
 *
 * Case-insensitive (`i` flag) since header names ("Authorization") and scheme
 * names ("Bearer", "Token", "Basic") are sometimes lower-cased in error
 * bodies. `g` flag for replace-all.
 */
const SECRET_PATTERN = new RegExp(
  // Authorization schemes — required whitespace between scheme and value
  "\\bBearer\\s+[A-Za-z0-9_\\-\\.]{8,}\\b" +
    "|\\bToken\\s+[A-Za-z0-9_\\-\\.]{8,}\\b" +
    "|\\bBasic\\s+[A-Za-z0-9+/=]{12,}\\b" +
    // Bare tokens by known prefix (e.g. `sk-abc…`, `r8_xyz…`)
    `|\\b(?:${PREFIX_PATTERN})[_\\-][A-Za-z0-9_\\-\\.]{8,}\\b` +
    // Generic key=value pairs (URL params, JSON bodies, header dumps)
    "|\\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|refresh[_-]?token)\\s*[:=]\\s*['\"]?[^\\s,;'\"&]+",
  "gi",
);

/** Header names that should always be redacted regardless of value shape. */
const SENSITIVE_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "apikey",
  "x-auth-token",
  "x-csrf-token",
];

/** Object keys that should always be redacted regardless of value shape. */
const SENSITIVE_OBJECT_KEYS = [
  "apikey",
  "api_key",
  "apiKey",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "secret",
  "secretkey",
  "secret_key",
  "secretKey",
  "password",
  "authorization",
  "oauth",
  "oauthToken",
  "credentials",
  "authContext",
  "authToken",
  "sessionToken",
  "serviceAccountKey",
  "secretAccessKey",
  // PII, not a secret — but it has no business in debug log dumps.
  "userEmail",
];

/**
 * Truncate `text` to `maxLen` chars then replace embedded secrets with `***`.
 *
 * Use this for free-form text logged from response/request bodies. For
 * structured data (records, headers) prefer {@link sanitizeRecord} and
 * {@link sanitizeHeaders} which know to redact by key name as well.
 *
 * @param text   - Raw text to sanitize (typically an HTTP response body).
 * @param maxLen - Maximum number of characters to keep (default 500).
 */
export function sanitizeForLog(text: string, maxLen = 500): string {
  if (!text) {
    return text;
  }
  return text.slice(0, maxLen).replace(SECRET_PATTERN, "***");
}

/**
 * Stringify non-string message/tool content without ever throwing.
 * JSON.stringify on a giant multimodal/tool-result payload can exceed V8's
 * maximum string length and throw `RangeError: Invalid string length` — a
 * generation turn must degrade to a placeholder, not abort, when that
 * happens. Shared by the SDK core and providers (single source of truth).
 */
export function stringifyContentSafe(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  try {
    return JSON.stringify(content) ?? String(content);
  } catch {
    return "[content too large to serialize]";
  }
}

/**
 * Serialize an arbitrary value for a debug log without ever throwing or
 * producing an unbounded string.
 *
 * `JSON.stringify` on a full options object (conversation history + tool
 * outputs) can exceed V8's maximum string length and throw
 * `RangeError: Invalid string length`, which — when evaluated eagerly inside
 * a logger call — aborts the surrounding generation turn (observed in
 * production). This helper caps the output and converts any stringify
 * failure (RangeError, circular structure, BigInt, …) into a placeholder.
 *
 * Callers MUST still gate on `logger.shouldLog("debug")` per the Logger
 * Guard rule — this helper makes serialization safe, not free.
 *
 * @param value  - Arbitrary value to serialize.
 * @param maxLen - Maximum number of characters to keep (default 10 000).
 */
export function safeDebugSerialize(value: unknown, maxLen = 10_000): string {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return String(value);
    }
    return json.length > maxLen
      ? `${json.slice(0, maxLen)}…[truncated ${json.length - maxLen} chars]`
      : json;
  } catch (error) {
    return `[unserializable: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Strip embedded `user:pass@` credentials from a URL's authority component
 * before logging it or surfacing it in a user-facing error.
 *
 * Turns `https://user:secret@host/path` into `https://***@host/path` while
 * leaving credential-free URLs untouched, so the host/port/path stay useful
 * for diagnostics. Use this for any `baseURL`/endpoint a caller may have
 * supplied with inline credentials. The match is global, so every `//…@`
 * authority in the string is redacted (e.g. a proxy chain or a URL embedded
 * in a query parameter), not just the first. IPv6 literal hosts (`//u:p@[::1]/x`)
 * and percent-encoded userinfo (`//u:p%40x@host/x`) are handled naturally —
 * neither `[`/`]` nor `%` stop either pass below, so the bracketed host or
 * encoded byte just rides along as part of the (non-redacted) remainder.
 *
 * This is best-effort defense-in-depth for free-form logging, deliberately
 * regex-based so it can scrub *multiple* embedded authorities out of
 * arbitrary text (a real URL parser only ever parses one URL at a time).
 * It is NOT the primary protection for user-facing errors — that's
 * {@link redactUrlForError}, which parses the single input via `new URL()`
 * and reconstructs from protocol+host+pathname, never touching userinfo at
 * all. Prefer that function whenever the input is known to be exactly one
 * URL.
 *
 * Two passes, deliberately:
 *  1. Well-formed authorities — credentials with no raw `/` — bounded at the
 *     authority's first `/` (or string end). Greedy backtracking naturally
 *     absorbs multiple `@` segments within one authority (e.g. `//a@b@host`
 *     → `//***@host`) while leaving a second, separate `//...@` authority
 *     elsewhere in the string (e.g. one embedded in a query parameter)
 *     untouched, because pass 1's own exclusion of `/` stops it at the first
 *     `/`, before it can ever reach a nested authority.
 *  2. Malformed authorities whose credentials contain an unescaped `/`
 *     (e.g. `//user:sec/ret@host/path`) — pass 1 can't find an `@` before
 *     hitting that `/`, so this pass allows `/` and redacts up to the last
 *     remaining `@`. It stops before any *nested* `//` (via a negative
 *     lookahead) rather than excluding a specific character like `*` —
 *     excluding a literal character is what let a password containing both
 *     `/` and `*` (e.g. `//user:pa*ss/word@host/path`, legal under RFC 3986)
 *     slip through both passes entirely in an earlier version of this
 *     function.
 *
 * @param url - The URL (or URL-shaped string) to redact.
 */
export function redactUrlCredentials(url: string): string {
  const wellFormed = url.replace(/\/\/[^/\s"'<>]*@/g, "//***@");
  return wellFormed.replace(/\/\/(?:(?!\/\/)[^\s"'<>])*@/g, "//***@");
}

/**
 * Reduce a URL to its origin + pathname for safe inclusion in error messages
 * and logs, dropping the query string and fragment — where presigned-URL
 * signatures, SAS tokens, and other secrets commonly live — while keeping
 * enough of the URL (scheme, host, path) for the error to stay diagnostic.
 *
 * Falls back to a best-effort redacted string (query/fragment and
 * `user:pass@` stripped) when the input isn't a parseable absolute URL.
 * Either way the result is capped at 200 chars so a very long host/path
 * can't blow up the error message.
 *
 * @param url - The URL (or URL-shaped string) to redact.
 */
export function redactUrlForError(url: string): string {
  const truncate = (s: string): string =>
    s.length > 200 ? `${s.slice(0, 200)}…` : s;
  try {
    const parsed = new URL(url);
    // Reconstruct explicitly from protocol + host + pathname — never
    // parsed.username/parsed.password, and never parsed.href (which
    // re-serializes any embedded userinfo) — so a `user:pass@host` in the
    // input can't leak into a diagnostic error message.
    return truncate(`${parsed.protocol}//${parsed.host}${parsed.pathname}`);
  } catch {
    // Unparseable input: `new URL()` gave us nothing to work with, so
    // best-effort drop the query/fragment (where secrets like tokens live)
    // and strip any `//user:pass@` segment before falling back to the raw
    // string — never echo the input completely unredacted.
    const withoutQueryOrFragment = url.split(/[?#]/)[0];
    return truncate(redactUrlCredentials(withoutQueryOrFragment));
  }
}

/**
 * Scrub any embedded absolute URLs out of free-form text — typically the
 * `.message` of an underlying network/DNS/TLS error thrown by `fetch`,
 * undici's `request()`, or Node's resolver, all of which frequently embed
 * the full request URL (query string, credentials, and all) verbatim.
 * Interpolating that message raw into a thrown or logged error would leak a
 * presigned URL's token even after the explicit URL argument was already
 * redacted via {@link redactUrlForError}. Finds each `scheme://…` run in the
 * text and replaces it with its redacted form.
 *
 * @param text - Free-form text (typically `Error.message`) to scrub.
 */
export function redactUrlsInText(text: string): string {
  return text.replace(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s"'<>)]+/g, (match) =>
    redactUrlForError(match),
  );
}

/**
 * Redact every occurrence of `filePath` from an error message, checking both
 * the path exactly as given and its `path.resolve()`'d form.
 *
 * Node's own fs errors (ENOENT/EACCES) embed the exact string passed to the
 * fs call, so a plain substring match usually suffices — but wrapped or
 * lower-level errors sometimes normalize the path first (relative→absolute,
 * trailing-slash variations), which an exact-match-only redaction would miss.
 * This is defense-in-depth, not a guarantee: a `realpath`-resolved (symlink-
 * following) variant can still differ from both forms and would slip through.
 *
 * @param message  - The error message to scrub.
 * @param filePath - The path to redact (both as given and resolved).
 */
export function redactPathFromMessage(
  message: string,
  filePath: string,
): string {
  const safeName = basename(filePath);
  // Longest-first: the resolved (absolute) form always contains the relative
  // form as a substring, so redacting the relative form first would only
  // strip the trailing segment of an absolute path and leave its parent
  // directory behind (e.g. "/Users/me/project/foo/bar.png" redacting
  // "foo/bar.png" first leaves "/Users/me/project/bar.png"). Redacting the
  // longer resolved variant first removes the whole absolute path in one
  // pass, so the shorter relative pass below has nothing left to match.
  return message
    .split(resolvePath(filePath))
    .join(safeName)
    .split(filePath)
    .join(safeName);
}

/**
 * Build a sanitized copy of a network/URL/file error, safe to attach as
 * `Error.cause` on a rethrow.
 *
 * Redacting only the OUTER thrown error's message isn't enough: if the RAW
 * underlying error is attached as `cause`, anything that walks the cause
 * chain (cause-aware logging, telemetry spans) can still recover an
 * unredacted URL/path/secret via `error.cause.message`. This returns a NEW
 * `Error` whose message has been through {@link redactUrlsInText} — and,
 * when `options.filePath` is supplied, {@link redactPathFromMessage} too, so
 * a filesystem error's ENOENT/EACCES text doesn't leak the host's directory
 * layout via the cause chain the way the outer message already avoids.
 * `.name` and `.code` (`NodeJS.ErrnoException`) are copied over so retry
 * classification (e.g. `isRetryableNetworkError`) still works when it
 * inspects the cause. The raw original is never referenced by the result.
 *
 * Handles non-`Error` thrown values too (a raw string/object can just as
 * easily carry an unredacted URL or path) by running their `String()` form
 * through the same redaction before wrapping.
 *
 * @param error   - The raw underlying error (or thrown value) to sanitize.
 * @param options - `filePath`: a known filesystem path to redact to its
 *                  basename, in addition to URL redaction.
 */
export function sanitizeErrorCause(
  error: unknown,
  options?: { filePath?: string },
): Error {
  const redact = (text: string): string => {
    const urlSafe = redactUrlsInText(text);
    return options?.filePath
      ? redactPathFromMessage(urlSafe, options.filePath)
      : urlSafe;
  };
  if (!(error instanceof Error)) {
    return new Error(redact(String(error)));
  }
  const sanitized = new Error(redact(error.message));
  sanitized.name = error.name;
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== undefined) {
    (sanitized as NodeJS.ErrnoException).code = code;
  }
  return sanitized;
}

/**
 * Recursively sanitize a record/array, returning a structurally identical
 * value with sensitive keys redacted and string values run through
 * {@link sanitizeForLog}.
 *
 * Safe to call on any JSON-shaped data. Cycles are detected and replaced
 * with the string `"[Circular]"` to avoid infinite recursion when logging
 * mid-stream objects that reference themselves.
 *
 * @param value - The value to sanitize.
 * @param maxStringLen - Per-string truncation cap (default 1000).
 */
export function sanitizeRecord<T>(value: T, maxStringLen = 1000): T {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || v === undefined) {
      return v;
    }
    if (typeof v === "string") {
      return sanitizeForLog(v, maxStringLen);
    }
    if (typeof v !== "object") {
      return v;
    }
    if (seen.has(v as object)) {
      return "[Circular]";
    }
    seen.add(v as object);
    if (Array.isArray(v)) {
      return v.map(walk);
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (
        SENSITIVE_OBJECT_KEYS.some(
          (name) => name.toLowerCase() === k.toLowerCase(),
        )
      ) {
        out[k] = "***";
      } else {
        out[k] = walk(val);
      }
    }
    return out;
  };
  return walk(value) as T;
}

/**
 * Sanitize an HTTP headers object — redacts sensitive header names entirely
 * (`***`) and applies {@link sanitizeForLog} to remaining values.
 *
 * Accepts both `Headers` instances and plain-object header maps so providers
 * can log either shape uniformly.
 */
export function sanitizeHeaders(
  headers: Headers | Record<string, string | undefined> | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }
  const out: Record<string, string> = {};
  const set = (name: string, value: string | undefined | null): void => {
    if (value === undefined || value === null) {
      return;
    }
    const lower = name.toLowerCase();
    if (SENSITIVE_HEADER_NAMES.includes(lower)) {
      out[name] = "***";
      return;
    }
    out[name] = sanitizeForLog(value, 500);
  };
  if (headers instanceof Headers) {
    headers.forEach((value, key) => set(key, value));
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    set(key, value);
  }
  return out;
}
