/**
 * Retrieves a header value case-insensitively from either a Headers object or a plain record.
 *
 * @param headers - The HTTP headers object or record
 * @param headerName - The case-insensitive name of the header to retrieve
 * @returns The header value, or null if not found
 */
function getHeader(
  headers: Pick<Headers, "get"> | Readonly<Record<string, string>>,
  headerName: string,
): string | null {
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(headerName);
  }

  const normalizedHeaderName = headerName.toLowerCase();
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === normalizedHeaderName) {
      return value;
    }
  }

  return null;
}

/** A parsed hint must remain an exact, finite millisecond count. */
function representableDelayMs(value: number): number | undefined {
  const rounded = Math.round(value);
  return Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : undefined;
}

/**
 * Parses a duration string (e.g., "6m0s", "30s", "1h30m", "500ms") into milliseconds.
 *
 * @param raw - The raw duration string
 * @returns Duration in milliseconds, or undefined if invalid
 */
export function parseDurationMs(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  // Must consist of one or more [number][unit] components
  const durationPattern = /^(\d+(?:\.\d+)?(?:ms|s|m|h))+$/i;
  if (!durationPattern.test(trimmed)) {
    return undefined;
  }

  const tokenRegex = /(\d+(?:\.\d+)?)(ms|s|m|h)/gi;
  let totalMs = 0;
  let match: RegExpExecArray | null;
  let matchedLength = 0;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    matchedLength += match[0].length;
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "h":
        totalMs += num * 3600 * 1000;
        break;
      case "m":
        totalMs += num * 60 * 1000;
        break;
      case "s":
        totalMs += num * 1000;
        break;
      case "ms":
        totalMs += num;
        break;
    }
  }

  return matchedLength === trimmed.length
    ? representableDelayMs(totalMs)
    : undefined;
}

/**
 * Parses a single Retry-After header value into milliseconds.
 *
 * Checks in strict order:
 * 1. Strict numeric seconds (e.g. "5", "120", "1.5") without truncation of dates or durations
 * 2. HTTP-date or RFC 3339 / ISO 8601 date (e.g. "2026-10-18T12:00:00Z" or "Sun, 18 Oct 2026 12:00:00 GMT")
 * 3. Duration string (e.g. "6m0s", "30s", "1h30m", "500ms")
 *
 * @param value - The header value string
 * @returns Milliseconds to wait, or undefined if not parseable
 */
export function parseRetryAfterHeaderValue(
  value: string | null | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  // 1. Strict numeric representation (delta seconds)
  // Note: Avoid parseInt, which reads leading digits from dates ("2026-10-13..." -> 2026) or durations ("6m0s" -> 6)
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return representableDelayMs(seconds * 1000);
    }
  }

  // 2. HTTP-date or RFC 3339 / ISO 8601 date
  const parsedDate = Date.parse(trimmed);
  if (Number.isFinite(parsedDate)) {
    return representableDelayMs(Math.max(0, parsedDate - Date.now()));
  }

  // 3. Duration string (e.g. "6m0s", "30s", "500ms")
  const duration = parseDurationMs(trimmed);
  if (duration !== undefined && duration >= 0) {
    return duration;
  }

  return undefined;
}

/**
 * Parses X-RateLimit-Reset header value into milliseconds until reset.
 *
 * Handles:
 * - Delta seconds when value < 1e9 (e.g. "30", "60")
 * - Epoch seconds when 1e9 <= value <= 1e12
 * - Epoch milliseconds when value > 1e12
 * - Fallback to date or duration strings
 *
 * @param value - The X-RateLimit-Reset header value
 * @returns Milliseconds until reset, or undefined if not parseable
 */
export function parseRateLimitResetValue(
  value: string | null | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num) && num >= 0) {
      if (num < 1e9) {
        // Delta seconds (e.g. 30, 60, 300)
        return representableDelayMs(num * 1000);
      }
      // Unix epoch timestamp
      const resetTime = num > 1e12 ? num : num * 1000;
      return representableDelayMs(Math.max(0, resetTime - Date.now()));
    }
  }

  const parsedDate = Date.parse(trimmed);
  if (Number.isFinite(parsedDate)) {
    return representableDelayMs(Math.max(0, parsedDate - Date.now()));
  }

  const duration = parseDurationMs(trimmed);
  if (duration !== undefined && duration >= 0) {
    return duration;
  }

  return undefined;
}

/**
 * Parse standard and commonly used rate-limit response headers.
 *
 * @returns The requested delay in milliseconds, or undefined when the
 * response does not provide a usable rate-limit delay.
 */
export function parseRetryAfterMs(
  headers: Pick<Headers, "get"> | Readonly<Record<string, string>>,
): number | undefined {
  const retryAfter = getHeader(headers, "Retry-After");
  if (retryAfter) {
    const delay = parseRetryAfterHeaderValue(retryAfter);
    if (delay !== undefined) {
      return delay;
    }
  }

  const rateLimitReset = getHeader(headers, "X-RateLimit-Reset");
  if (rateLimitReset) {
    const delay = parseRateLimitResetValue(rateLimitReset);
    if (delay !== undefined) {
      return delay;
    }
  }

  if (getHeader(headers, "X-RateLimit-Remaining") === "0") {
    return 1000;
  }

  return undefined;
}
