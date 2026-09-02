#!/usr/bin/env tsx
/**
 * Continuous Test Suite — proxy connect-phase retry
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * The fault under test is a TCP connect to the upstream that never completes:
 * a SYN lost on a lossy uplink, which Node's happy-eyeballs timer reports as
 * `ETIMEDOUT` wrapped in undici's `fetch failed`. Nothing a live request can
 * be asked to do produces that on demand, and the outcomes that matter — how
 * many upstream attempts the proxy makes, whether a request queued behind a
 * failed recovery probe gets its own retry, and whether the terminal answer is
 * a typed 502 rather than the catch-all — are exact counts and shapes. So this
 * suite imports the route module and the token store directly, stubs
 * `globalThis.fetch` with the error shape captured from a real failure, and
 * drives the shipped `/v1/messages` handler in process. `proxyTestIsolation`
 * redirects HOME and blocks every provider host, so nothing here can reach
 * the network or a real credential.
 *
 * Background: on a Wi-Fi uplink losing about one SYN in five, two proxies
 * returned 116 `502 unhandled_proxy_error / ETIMEDOUT` in one day. The code
 * alone cannot say whether an `ETIMEDOUT` came before or after dispatch, so
 * it was treated as terminal; the `syscall: "connect"` on Node's error can.
 *
 * Run: pnpm run build && pnpm run test:proxy-connect-retry
 */

import { assert, defineSuite, logSection } from "./helpers/harness.js";
import "./helpers/proxyTestIsolation.js";
import {
  __testHooks,
  createClaudeProxyRoutes,
} from "../src/lib/server/routes/claudeProxyRoutes.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { clearAccountCooldown } from "../src/lib/proxy/accountCooldown.js";
import { resetUsageStatsForTests } from "../src/lib/proxy/usageStats.js";
import type { ServerContext } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Proxy connect-phase retry", {
  offline: true,
  perTestTimeoutMs: 60_000,
});

const isolatedFetch = globalThis.fetch;
const MESSAGES_URL_MARKER = "/v1/messages";
let sequence = 0;

// ---------------------------------------------------------------------------
// Error shapes, captured from a real failure on a lossy link
// ---------------------------------------------------------------------------

/** What undici hands the proxy when Node's connect attempt timer fires with
 *  the IPv4 SYN unanswered and no IPv6 route: an AggregateError whose every
 *  entry is a `connect` syscall failure, wrapped in `fetch failed`. */
function connectPhaseTimeout(): Error {
  const ipv4 = Object.assign(new Error("connect ETIMEDOUT 203.0.113.1:443"), {
    code: "ETIMEDOUT",
    syscall: "connect",
    address: "203.0.113.1",
    port: 443,
  });
  const ipv6 = Object.assign(
    new Error("connect ENETUNREACH 2607:6bc0::10:443"),
    {
      code: "ENETUNREACH",
      syscall: "connect",
      address: "2607:6bc0::10",
      port: 443,
    },
  );
  const cause = Object.assign(new AggregateError([ipv4, ipv6], ""), {
    code: "ETIMEDOUT",
  });
  return new TypeError("fetch failed", { cause });
}

/** The same code arriving after dispatch: a socket that went quiet mid-read.
 *  Retrying this could duplicate provider work, so it must stay terminal. */
function postDispatchTimeout(): Error {
  const cause = Object.assign(new Error("read ETIMEDOUT"), {
    code: "ETIMEDOUT",
    syscall: "read",
  });
  return new TypeError("fetch failed", { cause });
}

// ---------------------------------------------------------------------------
// Hermetic harness around the shipped /v1/messages handler
// ---------------------------------------------------------------------------

type UpstreamStep =
  | { kind: "fail"; error: Error }
  | { kind: "ok" }
  | { kind: "hold"; started: () => void; release: Promise<void> };

function okMessagesResponse(): Response {
  return new Response(
    JSON.stringify({
      id: `msg_${Date.now()}`,
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5",
      content: [{ type: "text", text: "pong" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 4, output_tokens: 1 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function installUpstream(plan: UpstreamStep[]): {
  messagesCalls: () => number;
} {
  let calls = 0;
  globalThis.fetch = (async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes(MESSAGES_URL_MARKER)) {
      if (url.includes("/api/oauth/usage")) {
        // The limits refresh is not under test.
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected upstream call in test: ${url}`);
    }
    calls += 1;
    const step = plan.shift();
    if (!step) {
      throw new Error("upstream stub received more calls than planned");
    }
    if (step.kind === "hold") {
      step.started();
      await step.release;
      throw connectPhaseTimeout();
    }
    if (step.kind === "fail") {
      throw step.error;
    }
    return okMessagesResponse();
  }) as typeof globalThis.fetch;
  return { messagesCalls: () => calls };
}

async function withAccount<T>(run: (label: string) => Promise<T>): Promise<T> {
  sequence += 1;
  const label = `connect-retry-${process.pid}-${sequence}@example.test`;
  const key = `anthropic:${label}`;
  await tokenStore.saveTokens(key, {
    accessToken: `access-${sequence}`,
    refreshToken: `refresh-${sequence}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
    tokenType: "Bearer",
  });
  try {
    return await run(label);
  } finally {
    globalThis.fetch = isolatedFetch;
    await clearAccountCooldown(key).catch(() => undefined);
    await tokenStore.clearTokens(key).catch(() => undefined);
    await resetUsageStatsForTests();
    __testHooks.clearProviderTransportCoordinatorForTests();
  }
}

function messagesContext(requestId: string): ServerContext {
  return {
    requestId,
    method: "POST",
    path: "/v1/messages",
    headers: { "content-type": "application/json" },
    query: {},
    params: {},
    body: {
      model: "claude-sonnet-4-5",
      max_tokens: 32,
      stream: false,
      messages: [{ role: "user", content: "ping" }],
    },
    metadata: {},
    responseHeaders: {},
    timestamp: Date.now(),
    // The messages route never touches the SDK or tool registry; the two
    // placeholders only satisfy the context shape.
    neurolink: {},
    toolRegistry: {},
  } as unknown as ServerContext;
}

/**
 * The handler answers a success with a `Response` and a typed failure with a
 * plain `ClaudeErrorResponse` object; the server adapter maps the latter to
 * its HTTP status. Normalise both so the tests can assert on one shape.
 */
async function callMessages(
  requestId: string,
): Promise<{ ok: boolean; status: number | null; body: unknown }> {
  const route = createClaudeProxyRoutes().routes.find(
    (r) => r.path.endsWith("/v1/messages") && r.method === "POST",
  );
  if (!route) {
    throw new Error("POST /v1/messages is not registered");
  }
  const result = await route.handler(messagesContext(requestId));
  if (result instanceof Response) {
    const text = await result.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // keep the raw text
    }
    return { ok: result.status === 200, status: result.status, body };
  }
  const errorType = errorTypeOf(result);
  return { ok: errorType === "", status: null, body: result };
}

function errorTypeOf(body: unknown): string {
  const candidate = body as {
    type?: unknown;
    error?: { type?: unknown };
  } | null;
  return candidate?.type === "error" &&
    typeof candidate.error?.type === "string"
    ? candidate.error.type
    : "";
}

function errorMessageOf(body: unknown): string {
  const candidate = body as { error?: { message?: unknown } } | null;
  return typeof candidate?.error?.message === "string"
    ? candidate.error.message
    : "";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

logSection("Connect-phase classification");

await test("a connect-phase ETIMEDOUT is retryable; a post-dispatch one is not", async () => {
  const { isRetryableNetworkError, isConnectPhaseNetworkError } = __testHooks;
  assert(
    isConnectPhaseNetworkError(connectPhaseTimeout()),
    "happy-eyeballs aggregate of connect failures not recognised as connect-phase",
  );
  assert(
    isRetryableNetworkError(connectPhaseTimeout()),
    "connect-phase ETIMEDOUT still classified as terminal",
  );
  const single = new TypeError("fetch failed", {
    cause: Object.assign(new Error("connect ETIMEDOUT 203.0.113.1:443"), {
      code: "ETIMEDOUT",
      syscall: "connect",
    }),
  });
  assert(
    isRetryableNetworkError(single),
    "single-address connect ETIMEDOUT still classified as terminal",
  );
  assert(
    !isConnectPhaseNetworkError(postDispatchTimeout()),
    "a read-phase ETIMEDOUT was treated as connect-phase",
  );
  assert(
    !isRetryableNetworkError(postDispatchTimeout()),
    "a read-phase ETIMEDOUT became retryable",
  );
  const mixed = new TypeError("fetch failed", {
    cause: Object.assign(
      new AggregateError(
        [
          Object.assign(new Error("a"), {
            code: "ETIMEDOUT",
            syscall: "connect",
          }),
          Object.assign(new Error("b"), {
            code: "ECONNRESET",
            syscall: "read",
          }),
        ],
        "",
      ),
      { code: "ETIMEDOUT" },
    ),
  });
  assert(
    !isRetryableNetworkError(mixed),
    "an aggregate containing a post-dispatch failure became retryable",
  );
  assert(
    !isRetryableNetworkError(
      Object.assign(new Error("x"), { code: "ECONNRESET", syscall: "read" }),
    ),
    "ECONNRESET became retryable",
  );
  assert(
    isRetryableNetworkError(
      Object.assign(new Error("x"), { code: "UND_ERR_CONNECT_TIMEOUT" }),
    ),
    "undici connect timeout lost its retryable status",
  );
});

logSection("Retry behaviour through the shipped /v1/messages handler");

await test("one lost connect is retried on the same account and the request succeeds", async () => {
  await withAccount(async () => {
    const upstream = installUpstream([
      { kind: "fail", error: connectPhaseTimeout() },
      { kind: "ok" },
    ]);
    const result = await callMessages("connect-retry-once");
    assert(
      result.ok,
      `expected a success, got error type ${errorTypeOf(result.body) || result.status}`,
    );
    assert(
      upstream.messagesCalls() === 2,
      `expected two upstream attempts, saw ${upstream.messagesCalls()}`,
    );
  });
});

await test("persistent connect failures end in a typed 502 after the connect-phase budget, not the catch-all", async () => {
  await withAccount(async () => {
    const plan: UpstreamStep[] = [];
    for (let i = 0; i < 12; i += 1) {
      plan.push({ kind: "fail", error: connectPhaseTimeout() });
    }
    const upstream = installUpstream(plan);
    const result = await callMessages("connect-retry-exhausted");
    assert(!result.ok, "exhausted connect failures still produced a success");
    assert(
      errorTypeOf(result.body) === "transient_error",
      `expected a transient_error, got ${errorTypeOf(result.body) || result.status}`,
    );
    const message = errorMessageOf(result.body);
    assert(
      message.includes("(ETIMEDOUT)"),
      "terminal 502 does not carry the transport error code",
    );
    assert(
      !message.includes("Proxy internal error"),
      "connect failures still fell through to the catch-all",
    );
    assert(
      upstream.messagesCalls() ===
        1 + __testHooks.MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES,
      `expected ${1 + __testHooks.MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES} upstream attempts, saw ${upstream.messagesCalls()}`,
    );
  });
});

await test("a post-dispatch ETIMEDOUT is still terminal and not retried", async () => {
  await withAccount(async () => {
    const upstream = installUpstream([
      { kind: "fail", error: postDispatchTimeout() },
      { kind: "ok" },
    ]);
    let threw = false;
    try {
      await callMessages("connect-retry-post-dispatch");
    } catch {
      threw = true;
    }
    assert(threw, "a post-dispatch timeout was swallowed instead of surfacing");
    assert(
      upstream.messagesCalls() === 1,
      `a post-dispatch timeout was retried: ${upstream.messagesCalls()} attempts`,
    );
  });
});

await test("a request queued behind a failed recovery probe retries instead of failing", async () => {
  await withAccount(async () => {
    let probeStarted!: () => void;
    const probeStartedPromise = new Promise<void>((resolve) => {
      probeStarted = resolve;
    });
    let releaseProbe!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      releaseProbe = resolve;
    });
    const upstream = installUpstream([
      // A's first attempt: fails at once and degrades the shared transport.
      { kind: "fail", error: connectPhaseTimeout() },
      // A's retry becomes the recovery probe; held so B can queue behind it.
      { kind: "hold", started: probeStarted, release: releasePromise },
      // Whoever probes next succeeds, and so does the other request.
      { kind: "ok" },
      { kind: "ok" },
    ]);

    const a = callMessages("connect-retry-probe-a");
    await probeStartedPromise;
    const b = callMessages("connect-retry-probe-b");
    // Let B reach the coordinator and park on the in-flight probe.
    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseProbe();

    const [resultA, resultB] = await Promise.all([a, b]);
    assert(
      resultB.ok,
      `request queued behind the failed probe got ${errorTypeOf(resultB.body) || resultB.status}`,
    );
    assert(
      resultA.ok,
      `probing request got ${errorTypeOf(resultA.body) || resultA.status}`,
    );
    assert(
      upstream.messagesCalls() === 4,
      `expected four upstream attempts, saw ${upstream.messagesCalls()}`,
    );
  });
});

await runSuite();
