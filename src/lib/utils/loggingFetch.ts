/**
 * Shared logging-fetch wrapper.
 *
 * Wraps `createProxyFetch()` and logs every non-2xx upstream response with:
 *   - provider label
 *   - HTTP status code
 *   - URL with embedded credentials / signed query params masked
 *     (via `maskProxyUrl`)
 *   - request body size (string-body only — multipart/streamed bodies
 *     report 0)
 *
 * Response bodies are NOT logged by default (they can echo prompt fragments,
 * tool payloads, or echoed auth tokens). Set `NEUROLINK_DEBUG_HTTP=1` to opt
 * into body logging — and even then bodies are run through `sanitizeForLog`
 * to redact `Bearer …`, `sk-…`, `Token …`, and the other 11 token formats
 * covered by `logSanitize.SECRET_PATTERN`.
 *
 * Previously this same function was hand-rolled in 11 provider files
 * (cohere, xai, groq, togetherAi, fireworks, perplexity, cloudflare,
 * llamaCpp, lmStudio, nvidiaNim, deepseek) with subtly different bodies.
 * Extracting it kills the drift risk and gives a single place to harden.
 *
 * @module utils/loggingFetch
 */

import { createProxyFetch, maskProxyUrl } from "../proxy/proxyFetch.js";
import { logger } from "./logger.js";
import { sanitizeForLog } from "./logSanitize.js";

/**
 * Construct a fetch-compatible function that logs upstream non-OK responses
 * under the given provider label.
 */
export function createLoggingFetch(provider: string): typeof fetch {
  const base = createProxyFetch();
  return (async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const reqSize =
      init?.body && typeof init.body === "string" ? init.body.length : 0;

    const response = await base(input, init);
    if (!response.ok) {
      const safeUrl = maskProxyUrl(url) ?? "<redacted>";
      if (process.env.NEUROLINK_DEBUG_HTTP === "1") {
        const clone = response.clone();
        const raw = await clone.text().catch(() => "<unreadable>");
        logger.warn(`[${provider}] upstream ${response.status}`, {
          url: safeUrl,
          body: sanitizeForLog(raw),
          reqSize,
        });
      } else {
        logger.warn(
          `[${provider}] upstream ${response.status} url=${safeUrl} reqSize=${reqSize}`,
        );
      }
    }
    return response;
  }) as typeof fetch;
}
