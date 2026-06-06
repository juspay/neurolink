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
 * Strip embedded `user:pass@` credentials from a URL's authority component
 * before logging it or surfacing it in a user-facing error.
 *
 * Turns `https://user:secret@host/path` into `https://***@host/path` while
 * leaving credential-free URLs untouched, so the host/port/path stay useful
 * for diagnostics. Use this for any `baseURL`/endpoint a caller may have
 * supplied with inline credentials. The match is global, so every `//…@`
 * authority in the string is redacted (e.g. a proxy chain or a URL embedded
 * in a query parameter), not just the first.
 *
 * @param url - The URL (or URL-shaped string) to redact.
 */
export function redactUrlCredentials(url: string): string {
  return url.replace(/\/\/[^/@]+@/g, "//***@");
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
