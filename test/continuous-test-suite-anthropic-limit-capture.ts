#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Anthropic Provider Limit Capture (HTTP round trip)
 *
 * Exercises the seam the in-process suite cannot: a real HTTP request from the
 * Anthropic provider, through a real socket, to a server that answers with the
 * headers the NeuroLink Claude proxy emits. This is the exact shape of the
 * "point the SDK at the proxy as a direct provider" setup — `ANTHROPIC_BASE_URL`
 * plus an API key — and proves that limits survive the wire and land on
 * `result.limits`.
 *
 * HERMETIC. A local stub upstream stands in for the proxy, so the suite needs
 * no credentials, contacts no real account, and consumes no subscription quota.
 * `ANTHROPIC_API_KEY` is a placeholder the stub ignores.
 *
 * NOTE on assertion messages: the harness downgrades a failure to SKIP when the
 * text matches `isExpectedProviderError()`. Report field names, never payloads.
 *
 * Run with: npx tsx test/continuous-test-suite-anthropic-limit-capture.ts
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, section, runSuite } = defineSuite("Anthropic Limit Capture");

// ---------------------------------------------------------------------------
// Stub upstream — answers like the NeuroLink Claude proxy
// ---------------------------------------------------------------------------

type StubOptions = {
  /** Extra response headers, typically the quota set. */
  headers?: Record<string, string>;
  status?: number;
  body?: string;
};

function messageBody(): string {
  return JSON.stringify({
    id: "msg_stub",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    content: [{ type: "text", text: "pong" }],
    stop_reason: "end_turn",
    usage: { input_tokens: 8, output_tokens: 2 },
  });
}

/** Headers a proxy-served response carries: Anthropic verbatim + x-neurolink-*. */
function proxyStyleHeaders(): Record<string, string> {
  const fiveHoursOut = Math.floor(Date.now() / 1000) + 5 * 3600;
  const weekOut = Math.floor(Date.now() / 1000) + 7 * 86400;
  return {
    "anthropic-ratelimit-unified-status": "allowed",
    "anthropic-ratelimit-unified-5h-utilization": "0.42",
    "anthropic-ratelimit-unified-5h-status": "allowed",
    "anthropic-ratelimit-unified-5h-reset": String(fiveHoursOut),
    "anthropic-ratelimit-unified-7d-utilization": "0.19",
    "anthropic-ratelimit-unified-7d-status": "allowed",
    "anthropic-ratelimit-unified-7d-reset": String(weekOut),
    "x-request-id": "req_stub_1",
    "x-neurolink-quota-source": "live",
    "x-neurolink-account": "stub@example.com",
    "x-neurolink-account-type": "oauth",
    "x-neurolink-served-by": "anthropic",
    "x-neurolink-quota-session-left-pct": "58",
    "x-neurolink-quota-weekly-left-pct": "81",
    "x-neurolink-pool-available": "3",
    "x-neurolink-pool-cooling": "1",
    "x-neurolink-pool-best-session-left": "88",
  };
}

async function withStubUpstream(
  options: StubOptions,
  body: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const received: Array<Record<string, string | string[] | undefined>> = [];
  const server: Server = createServer((req, res) => {
    received.push(req.headers);
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      res.writeHead(options.status ?? 200, {
        "content-type": "application/json",
        ...(options.headers ?? {}),
      });
      res.end(options.body ?? messageBody());
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;

  const priorBaseUrl = process.env.ANTHROPIC_BASE_URL;
  const priorApiKey = process.env.ANTHROPIC_API_KEY;
  const priorAuthMethod = process.env.ANTHROPIC_AUTH_METHOD;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_API_KEY = "sk-ant-stub-not-a-real-key";
  // Force api_key mode so a developer's real OAuth credentials on this machine
  // are never picked up by the provider under test.
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";

  try {
    await body(`http://127.0.0.1:${port}`);
  } finally {
    const restore = (key: string, value: string | undefined): void => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    };
    restore("ANTHROPIC_BASE_URL", priorBaseUrl);
    restore("ANTHROPIC_API_KEY", priorApiKey);
    restore("ANTHROPIC_AUTH_METHOD", priorAuthMethod);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** Fresh provider per test — the constructor reads env at construction time. */
async function createProvider(): Promise<{
  generate: (prompt: string, withAnalytics?: boolean) => Promise<unknown>;
}> {
  const { AnthropicProvider } =
    await import("../src/lib/providers/anthropic/client.js");
  const provider = new AnthropicProvider("claude-sonnet-4-6");
  return {
    generate: (prompt: string, withAnalytics = false) =>
      provider.generate({
        input: { text: prompt },
        disableTools: true,
        maxTokens: 16,
        ...(withAnalytics ? { enableAnalytics: true } : {}),
      } as never),
  };
}

// ===========================================================================

section("HTTP round trip");

await test("surfaces proxy limit headers on the generate result", async () => {
  await withStubUpstream({ headers: proxyStyleHeaders() }, async () => {
    const provider = await createProvider();
    const result = (await provider.generate("ping", true)) as {
      limits?: {
        rateLimit: Record<string, unknown>;
        quotaSource?: string;
        account?: string;
        servedBy?: string;
        pool?: Record<string, unknown>;
      };
      analytics?: { limits?: unknown };
    } | null;

    assert(result !== null, "the stub upstream should produce a result");
    assert(
      result?.limits !== undefined,
      "result.limits must be populated from response headers",
    );
    assertEqual(
      result?.limits?.rateLimit.sessionLeftPct,
      58,
      "session headroom must survive the HTTP round trip",
    );
    assertEqual(
      result?.limits?.rateLimit.weeklyLeftPct,
      81,
      "weekly headroom must survive the HTTP round trip",
    );
    assertEqual(
      result?.limits?.quotaSource,
      "live",
      "quota provenance must survive the HTTP round trip",
    );
    assertEqual(
      result?.limits?.account,
      "stub@example.com",
      "serving account must survive the HTTP round trip",
    );
    assertEqual(
      result?.limits?.pool?.available,
      3,
      "pool headroom must survive the HTTP round trip",
    );
    assert(
      result?.analytics?.limits !== undefined,
      "analytics.limits must mirror result.limits",
    );
  });
});

await test("reports absolute remaining counts for an api-key style response", async () => {
  await withStubUpstream(
    {
      headers: {
        "anthropic-ratelimit-requests-limit": "1000",
        "anthropic-ratelimit-requests-remaining": "937",
        "anthropic-ratelimit-tokens-limit": "80000",
        "anthropic-ratelimit-tokens-remaining": "79250",
      },
    },
    async () => {
      const provider = await createProvider();
      const result = (await provider.generate("ping")) as {
        limits?: { rateLimit: Record<string, unknown> };
      } | null;

      assertEqual(
        result?.limits?.rateLimit.requestsRemaining,
        937,
        "absolute remaining requests must survive the round trip",
      );
      assertEqual(
        result?.limits?.rateLimit.tokensRemaining,
        79250,
        "absolute remaining tokens must survive the round trip",
      );
      assert(
        result?.limits?.rateLimit.sessionLeftPct === undefined,
        "an api-key response has no subscription window headroom to report",
      );
    },
  );
});

await test("leaves limits unset when the upstream reports nothing", async () => {
  await withStubUpstream({ headers: {} }, async () => {
    const provider = await createProvider();
    const result = (await provider.generate("ping")) as {
      limits?: unknown;
    } | null;

    assert(result !== null, "the stub upstream should produce a result");
    assertEqual(
      result?.limits,
      undefined,
      "no limit headers must mean no fabricated limits field",
    );
  });
});

await runSuite();
