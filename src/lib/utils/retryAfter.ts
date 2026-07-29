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
    const seconds = parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) {
      return Math.max(0, seconds * 1000);
    }

    const retryDate = new Date(retryAfter);
    if (!Number.isNaN(retryDate.getTime())) {
      return Math.max(0, retryDate.getTime() - Date.now());
    }
  }

  const rateLimitReset = getHeader(headers, "X-RateLimit-Reset");
  if (rateLimitReset) {
    const resetTimestamp = parseInt(rateLimitReset, 10);
    if (!Number.isNaN(resetTimestamp)) {
      const resetTime =
        resetTimestamp > 1e12 ? resetTimestamp : resetTimestamp * 1000;
      return Math.max(0, resetTime - Date.now());
    }
  }

  if (getHeader(headers, "X-RateLimit-Remaining") === "0") {
    return 1000;
  }

  return undefined;
}
