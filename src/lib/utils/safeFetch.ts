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
 * Redirects are refused by default. A caller that opts in (`maxRedirects`)
 * gets each hop validated and pinned exactly like the first request, and the
 * caller's `headers` are sent to the first host only — a credential meant for
 * one origin is never replayed to the one it redirects to. `allowInsecure`
 * and `allowPrivateNetwork` relax the URL policy for SDK callers that have
 * said so explicitly; the server path never passes them.
 *
 * When the environment configures a proxy for the URL (HTTPS_PROXY / ALL_PROXY,
 * and the host is not in NO_PROXY) the download goes through that proxy and
 * nowhere else: there is no fallback to a direct connection. The proxy resolves
 * the host name, so DNS pinning cannot apply; the URL is vetted by
 * `assertSafeUrlForProxy` instead (see there for what that covers).
 *
 * @module utils/safeFetch
 */

import type {
  PinnedAddress,
  SafeDownloadOptions,
  SafeDownloadResult,
} from "../types/index.js";
import { readBoundedBuffer } from "./sizeGuard.js";
import { assertSafeUrlForProxy, validateAndResolveUrl } from "./ssrfGuard.js";

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
 *
 * `undici` is imported dynamically (this function is only ever called from
 * the already-async `safeDownload`) so that requiring this module does not
 * force-load undici until a download actually happens. See
 * test/continuous-test-suite-import-cost.ts.
 */
async function buildPinnedAgent(
  hostname: string,
  addresses: readonly PinnedAddress[],
) {
  const { Agent } = await import("undici");
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
 * Hop limit when a caller opts into redirects but names no number.
 */
const DEFAULT_MAX_REDIRECTS = 5;

/** Ceiling on the hop count, whatever the caller asks for. */
const MAX_REDIRECTS_CEILING = 10;

/**
 * Check the response the same way for both transports, then read it under the
 * size cap.
 */
async function readDownloadResponse(
  response: Awaited<ReturnType<typeof import("undici").fetch>>,
  url: string,
  options: SafeDownloadOptions,
): Promise<Buffer> {
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
  if (options.method === "HEAD") {
    // A HEAD has no body to read; drain whatever the transport queued so the
    // connection is released, and hand back nothing.
    await response.body?.cancel().catch(() => undefined);
    return Buffer.alloc(0);
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

/**
 * Vet `url` for the chosen transport and return the dispatcher to send it
 * through. Through a proxy the proxy resolves the name, so only the URL text
 * can be vetted; without one the connection is pinned to the addresses the
 * guard cleared. Runs once per hop so a redirect gets the same treatment as
 * the request that produced it.
 */
async function prepareHop(
  url: string,
  options: SafeDownloadOptions,
): Promise<{ dispatcher: import("undici").Dispatcher; owned: boolean }> {
  const { getProxyDispatcherForUrl } = await import("../proxy/proxyFetch.js");
  const proxyDispatcher = await getProxyDispatcherForUrl(url);
  const guard = {
    allowInsecure: options.allowInsecure === true,
    allowPrivateNetwork: options.allowPrivateNetwork === true,
  };
  if (proxyDispatcher) {
    assertSafeUrlForProxy(url, guard);
    return { dispatcher: proxyDispatcher, owned: false };
  }
  const resolved = await validateAndResolveUrl(url, guard);
  const hostname = new URL(resolved.url).hostname.replace(/^\[|\]$/g, "");
  return {
    dispatcher: await buildPinnedAgent(hostname, resolved.addresses),
    owned: true,
  };
}

/**
 * Resolve a `Location` header against the URL that produced it, refusing
 * anything that is not an absolute HTTP(S) URL after resolution.
 */
function resolveRedirectTarget(
  location: string | null,
  from: string,
  label: string,
  status: number,
): string {
  if (!location) {
    throw new Error(
      `safeDownload(${label}): HTTP ${status} redirect without a Location header (for ${from})`,
    );
  }
  let target: URL;
  try {
    target = new URL(location, from);
  } catch {
    throw new Error(
      `safeDownload(${label}): HTTP ${status} redirect to an unparseable Location (for ${from})`,
    );
  }
  // Strip any userinfo a redirect tries to smuggle in; credentials never
  // travel on the URL here.
  target.username = "";
  target.password = "";
  return target.toString();
}

/**
 * Safely download an external URL and report what came back.
 *
 * Same guarantees as {@link safeDownload}; additionally returns the final
 * response's `Content-Type`/`Content-Encoding`, the URL that produced the body
 * and how many redirect hops were taken.
 *
 * @throws {Error} if any URL on the way is unsafe, the response is too large,
 *   a redirect is encountered beyond what `maxRedirects` allows, or the HTTP
 *   status indicates failure.
 */
export async function safeDownloadWithMeta(
  url: string,
  options: SafeDownloadOptions,
): Promise<SafeDownloadResult> {
  // Dynamic imports keep undici off the package's static import graph — it is
  // only needed once a download actually happens. See
  // test/continuous-test-suite-import-cost.ts.
  const { fetch: undiciFetch } = await import("undici");
  const maxRedirects = Math.min(
    Math.max(0, Math.floor(options.maxRedirects ?? 0)),
    MAX_REDIRECTS_CEILING,
  );

  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutCtrl.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const composedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutCtrl.signal])
    : timeoutCtrl.signal;

  let currentUrl = url;
  let hops = 0;
  try {
    for (;;) {
      const { dispatcher, owned } = await prepareHop(currentUrl, options);
      try {
        const response = await undiciFetch(currentUrl, {
          method: options.method ?? "GET",
          // The caller's headers ride on the FIRST request only. A redirect
          // target is a different authority as far as a credential is
          // concerned, even when the host name happens to match.
          headers: hops === 0 && options.headers ? options.headers : undefined,
          signal: composedSignal,
          redirect: "manual", // a 3xx → private-IP redirect would bypass the guard
          dispatcher,
        });
        if (
          response.status >= 300 &&
          response.status < 400 &&
          hops < maxRedirects
        ) {
          const next = resolveRedirectTarget(
            response.headers.get("location"),
            currentUrl,
            options.label,
            response.status,
          );
          // Release the redirect response before the next hop.
          await response.body?.cancel().catch(() => undefined);
          hops += 1;
          currentUrl = next;
          continue;
        }
        // fetch resolves at the headers. Keep the same deadline and abort
        // signal active while the bounded reader drains the body as well.
        const buffer = await readDownloadResponse(
          response,
          currentUrl,
          options,
        );
        return {
          buffer,
          contentType: response.headers.get("content-type") ?? "",
          contentEncoding: response.headers.get("content-encoding") ?? "",
          finalUrl: currentUrl,
          redirects: hops,
        };
      } finally {
        if (owned) {
          // Close the per-hop agent so the pinned connection isn't pooled.
          // The proxy agent is shared process-wide and stays open.
          dispatcher.close().catch(() => undefined);
        }
      }
    }
  } catch (error) {
    // A status/size rejection may happen before the body is consumed. Stop
    // that request so a pinned agent can close and a shared proxy agent does
    // not retain an unused response stream.
    timeoutCtrl.abort();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
  return (await safeDownloadWithMeta(url, options)).buffer;
}

/** Hop count applied when a caller opts into redirects without naming one. */
export function defaultRedirectHops(follow: boolean): number {
  return follow ? DEFAULT_MAX_REDIRECTS : 0;
}
