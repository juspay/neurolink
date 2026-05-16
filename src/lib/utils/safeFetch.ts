/**
 * Safe Fetch — SSRF-hardened binary download helper.
 *
 * Combines:
 *   - `assertSafeUrl` (validates and rejects blocked IPs)
 *   - undici `Agent` with custom `connect.lookup` so the actual connection
 *     uses the IP we validated (closes the DNS-rebinding window where the
 *     resolver returns a public IP for the guard but a private IP for the
 *     real request).
 *   - `readBoundedBuffer` for size cap.
 *   - `redirect: "manual"` so a 3xx → private-IP redirect can't bypass
 *     the guard.
 *
 * Use this for **every** download of an external (caller-supplied or
 * third-party-returned) URL. Direct `fetch(url)` of such URLs is unsafe.
 *
 * @module utils/safeFetch
 */

import { Agent, fetch as undiciFetch } from "undici";
import type { SafeDownloadOptions } from "../types/index.js";
import { readBoundedBuffer } from "./sizeGuard.js";
import { validateAndResolveUrl } from "./ssrfGuard.js";

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Build a once-off undici Agent whose connect lookup resolves `hostname` to a
 * fixed IP. This pins the actual TCP connection to the IP we validated,
 * removing the DNS-rebinding window.
 */
function buildPinnedAgent(hostname: string, ip: string, family: 4 | 6): Agent {
  return new Agent({
    connect: {
      lookup: (host, _options, callback) => {
        if (host.toLowerCase() !== hostname.toLowerCase()) {
          // The host the connect layer asks for differs from the URL host —
          // this happens for absolute Host headers etc. Reject defensively.
          callback(
            new Error(
              `safeFetch: refusing to resolve "${host}" — expected "${hostname}"`,
            ),
            "",
            0,
          );
          return;
        }
        callback(null, ip, family);
      },
    },
  });
}

/**
 * Safely download a binary asset from an external URL.
 *
 * @throws {Error} if the URL is unsafe, the response is too large, a redirect
 *   is encountered, or the HTTP status indicates failure.
 */
export async function safeDownload(
  url: string,
  options: SafeDownloadOptions,
): Promise<Buffer> {
  const { url: validatedUrl, ip, family } = await validateAndResolveUrl(url);
  const parsed = new URL(validatedUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  const agent = buildPinnedAgent(hostname, ip, family);

  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutCtrl.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const composedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutCtrl.signal])
    : timeoutCtrl.signal;

  let response: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    response = await undiciFetch(validatedUrl, {
      method: "GET",
      signal: composedSignal,
      redirect: "manual", // a 3xx → private-IP redirect would bypass the guard
      dispatcher: agent,
    });
  } finally {
    clearTimeout(timeoutId);
    // Close the per-request agent so the pinned connection isn't pooled.
    agent.close().catch(() => undefined);
  }

  if (response.status >= 300 && response.status < 400) {
    throw new Error(
      `safeDownload(${options.label}): refused to follow redirect ${response.status} → ${response.headers.get("location") ?? "<no-location>"} (for ${url})`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `safeDownload(${options.label}) failed: HTTP ${response.status} for ${url}`,
    );
  }

  // readBoundedBuffer expects a Response that exposes Content-Length and
  // arrayBuffer(). undici Response satisfies both.
  return readBoundedBuffer(
    response as unknown as Response,
    options.maxBytes,
    options.label,
  );
}
