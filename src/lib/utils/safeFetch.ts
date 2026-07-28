/**
 * Safe Fetch — SSRF-hardened binary download helper.
 *
 * Combines:
 *   - `assertSafeUrl` (validates and rejects blocked IPs)
 *   - undici `Agent` with custom `connect.lookup` so the actual connection
 *     only ever dials addresses we validated (closes the DNS-rebinding window
 *     where the resolver returns a public IP for the guard but a private IP
 *     for the real request).
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
import type { PinnedAddress, SafeDownloadOptions } from "../types/index.js";
import { readBoundedBuffer } from "./sizeGuard.js";
import { validateAndResolveUrl } from "./ssrfGuard.js";

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Build a once-off undici Agent whose connect lookup resolves `hostname` to
 * the validated address set. The actual TCP connection can only ever go to
 * an address the SSRF guard cleared, removing the DNS-rebinding window.
 *
 * The full set (IPv4 first) matters: pinning a single address turns one
 * unroutable family into a hard connect timeout. On IPv4-only networks where
 * the OS resolver prefers AAAA, that broke every safeDownload (Replicate /
 * Runway / Kling asset fetches) while plain curl of the same URL succeeded —
 * curl races both families (Happy Eyeballs); a one-address pin cannot.
 */
function buildPinnedAgent(
  hostname: string,
  addresses: readonly PinnedAddress[],
): Agent {
  const primary = addresses[0];
  if (!primary) {
    throw new Error(
      `safeFetch: no validated addresses to pin for "${hostname}"`,
    );
  }
  return new Agent({
    connect: {
      lookup: (host, options, callback) => {
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
        // Node ≥20 enables autoSelectFamily (Happy Eyeballs) by default, and
        // its lookup contract passes `all: true` expecting an address ARRAY.
        // Hand it every validated address so it can race families and fall
        // back when one is unroutable.
        if (options?.all) {
          callback(
            null,
            addresses.map((a) => ({ address: a.ip, family: a.family })),
          );
          return;
        }
        callback(null, primary.ip, primary.family);
      },
    },
  });
}

/**
 * Runtime-validating narrow across the undici → DOM `Response` type boundary.
 * `readBoundedBuffer` only touches `headers.get()` and `arrayBuffer()`; the
 * two libraries' `Response` declarations disagree on unrelated members
 * (headers iterator shapes), so validate the members actually used instead
 * of blindly asserting.
 */
function isBoundedBufferResponse(value: unknown): value is Response {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as {
    arrayBuffer?: unknown;
    headers?: { get?: unknown };
  };
  return (
    typeof candidate.arrayBuffer === "function" &&
    typeof candidate.headers === "object" &&
    candidate.headers !== null &&
    typeof candidate.headers.get === "function"
  );
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
  const { url: validatedUrl, addresses } = await validateAndResolveUrl(url);
  const parsed = new URL(validatedUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  const agent = buildPinnedAgent(hostname, addresses);

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
  if (!isBoundedBufferResponse(response)) {
    throw new Error(
      `safeDownload(${options.label}): response is missing headers.get()/arrayBuffer()`,
    );
  }
  return readBoundedBuffer(response, options.maxBytes, options.label);
}
