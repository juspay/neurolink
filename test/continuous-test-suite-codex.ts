#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Codex (ChatGPT) Pool Engine
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * This suite imports `__testHooks` from `codexProxyRoutes`, plus the Codex OAuth
 * and usage helpers, rather than driving a shipped surface. What determinism
 * buys: these are table-driven decisions — which account sorts first, how a 429
 * maps to a cooldown window, whether a refresh failure is permanent — and
 * reproducing them end to end would mean provoking a specific sequence of 429s
 * and token-endpoint failures across several real ChatGPT accounts, which
 * cannot be arranged on demand. Getting the refresh classification wrong
 * disables a working account and `auth cleanup` then deletes it, so it needs
 * coverage that does not depend on a live backend.
 *
 * `__testHooks` is a test-only export in `src/` and should shrink as this logic
 * gains a real surface.
 *
 * The last two cases are *not* under the exception: they drive
 * `node dist/cli/index.js` so the suite also proves the built package wires
 * Codex up at all. Without them every case above could pass while the shipped
 * CLI had no Codex surface. They run the CLI as a subprocess rather than
 * importing `dist`, so the one-module-graph rule is not at risk.
 *
 * Covers: account ordering, 429 cooldown planning, upstream header
 * construction, quota parsing, refresh-failure classification, and the built
 * CLI's Codex auth surface.
 *
 * No API keys and no network.
 *
 * Assertion messages deliberately never quote a payload: `defineSuite` treats a
 * message matching `isExpectedProviderError()` as a SKIP, so an upstream-looking
 * string in a failure message turns a real regression into a green run
 * (see CLAUDE.md).
 *
 * Run with: npx tsx test/continuous-test-suite-codex.ts
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import {
  decodeCodexAccessToken,
  importCodexAuthFile,
  isPermanentCodexRefreshFailure,
  resolveCodexAccountId,
} from "../src/lib/auth/codexOAuth.js";
import {
  codexRateLimitsToQuota,
  parseCodexRateLimitHeaders,
  resolveProxyStatusAccountIdentity,
} from "../src/lib/proxy/codexAccountUsage.js";
import {
  CodexFallbackResponseError,
  consumeCodexFallbackResponse,
  convertClaudeRequestToCodex,
  parseCodexFallbackSSE,
} from "../src/lib/proxy/codexFallback.js";
import { runWithShareContext } from "../src/lib/proxy/shareContext.js";
import { __testHooks as claudeProxyTestHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { __testHooks } from "../src/lib/server/routes/codexProxyRoutes.js";
import type {
  CodexRuntimeAccount,
  ProxyShareRequestContext,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite, runCLI } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Codex Pool Engine", {
  offline: true,
});

/** Fixed clock so reset arithmetic is deterministic. */
const NOW = 1_800_000_000_000;
const NOW_SECONDS = Math.floor(NOW / 1000);
const BORROWED_REQUEST_CONTEXT: ProxyShareRequestContext = {
  grantId: "test-grant",
  peerLabel: "test-peer",
  level: "live",
  gates: {},
  ledger: "unlimited",
};

function account(
  label: string,
  over: Partial<CodexRuntimeAccount> = {},
): CodexRuntimeAccount {
  return {
    key: `codex:${label}`,
    label,
    token: "t",
    ...over,
  } as CodexRuntimeAccount;
}

// ---------------------------------------------------------------------------
// Status identity
// ---------------------------------------------------------------------------

await test("status keeps same-label Anthropic and Codex cooldowns separate", () => {
  const label = "shared@example.com";
  const anthropic = resolveProxyStatusAccountIdentity(label, "oauth");
  const codex = resolveProxyStatusAccountIdentity(label, "codex-oauth");

  assertEqual(
    anthropic.key,
    "anthropic:shared@example.com",
    "Anthropic status must use the Anthropic account key",
  );
  assertEqual(
    codex.key,
    "codex:shared@example.com",
    "Codex status must use the Codex account key",
  );
  assert(
    anthropic.provider !== codex.provider && anthropic.key !== codex.key,
    "a shared email must not share provider cooldown state",
  );
});

await test("status treats Anthropic API-key accounts as Anthropic", () => {
  const apiKey = resolveProxyStatusAccountIdentity("env", "api_key");
  assertEqual(
    apiKey.provider,
    "anthropic",
    "Anthropic API-key rows must retain their provider identity",
  );
  assertEqual(
    apiKey.key,
    "anthropic:env",
    "Anthropic API-key rows must use the Anthropic cooldown key",
  );
});

await test("borrowed Codex fallback hides lender attribution headers", () => {
  const headers = runWithShareContext(BORROWED_REQUEST_CONTEXT, () =>
    claudeProxyTestHooks.redactHeadersForBorrower({
      "x-neurolink-account": "lender@example.com",
      "x-neurolink-account-type": "codex-oauth",
      "x-neurolink-pool-accounts": "3",
      "x-neurolink-served-by": "codex",
    }),
  );

  assertEqual(
    headers["x-neurolink-account"],
    undefined,
    "borrowed fallback exposed the lender account label",
  );
  assertEqual(
    headers["x-neurolink-account-type"],
    undefined,
    "borrowed fallback exposed the lender account type",
  );
  assertEqual(
    headers["x-neurolink-pool-accounts"],
    undefined,
    "borrowed fallback exposed lender pool metadata",
  );
  assertEqual(
    headers["x-neurolink-served-by"],
    "codex",
    "borrowed fallback hid provider attribution",
  );
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

await test("orderCodexAccounts puts cooling accounts last", () => {
  const cooling = account("cooling", { coolingUntil: NOW + 60_000 });
  const ready = account("ready", {
    quota: { sessionUsed: 0.9 } as CodexRuntimeAccount["quota"],
  });
  const order = __testHooks
    .orderCodexAccounts([cooling, ready], NOW)
    .map((a) => a.label);
  assertEqual(
    order.join(","),
    "ready,cooling",
    "a cooling account must sort behind a usable one even at higher utilization",
  );
});

await test("orderCodexAccounts probes an account with no quota first", () => {
  // Ranking unknowns last starves them: never picked means never observed.
  const known = account("known", {
    quota: { sessionUsed: 0.1 } as CodexRuntimeAccount["quota"],
  });
  const unknown = account("unknown");
  const order = __testHooks
    .orderCodexAccounts([known, unknown], NOW)
    .map((a) => a.label);
  assertEqual(
    order.join(","),
    "unknown,known",
    "an unobserved account must be probed ahead of a known one",
  );
});

await test("orderCodexAccounts fills the least-used account first", () => {
  const heavy = account("heavy", {
    quota: { sessionUsed: 0.8 } as CodexRuntimeAccount["quota"],
  });
  const light = account("light", {
    quota: { sessionUsed: 0.2 } as CodexRuntimeAccount["quota"],
  });
  const order = __testHooks
    .orderCodexAccounts([heavy, light], NOW)
    .map((a) => a.label);
  assertEqual(
    order.join(","),
    "light,heavy",
    "ordering must be least-used first",
  );
});

// ---------------------------------------------------------------------------
// Cooldown planning
// ---------------------------------------------------------------------------

await test("planCodexCooldown cools to the real reset for an exhausted window", () => {
  const weeklyReset = NOW_SECONDS + 3 * 24 * 3600;
  const weekly = __testHooks.planCodexCooldown(
    {
      sessionUsed: 0.2,
      sessionStatus: "allowed",
      sessionResetAt: 0,
      weeklyUsed: 1,
      weeklyStatus: "rejected",
      weeklyResetAt: weeklyReset,
      fallbackPercentage: 0,
      overageStatus: "rejected",
      lastUpdated: NOW,
    },
    0,
    NOW,
  );
  assertEqual(
    weekly.reason,
    "weekly",
    "an exhausted 7d window must cool weekly",
  );
  assertEqual(
    weekly.coolingUntil,
    weeklyReset * 1000,
    "a weekly cooldown must end at the provider reset",
  );
});

await test("planCodexCooldown falls back to transient without a usable reset", () => {
  // A rejected window with no reset cannot be waited out precisely; the
  // transient ceiling keeps the account out of rotation without stranding it.
  const plan = __testHooks.planCodexCooldown(
    {
      sessionUsed: 1,
      sessionStatus: "rejected",
      sessionResetAt: 0,
      weeklyUsed: 0,
      weeklyStatus: "allowed",
      weeklyResetAt: 0,
      fallbackPercentage: 0,
      overageStatus: "rejected",
      lastUpdated: NOW,
    },
    0,
    NOW,
  );
  assertEqual(
    plan.reason,
    "transient",
    "a resetless rejection must be transient",
  );
  assert(
    plan.coolingUntil > NOW && plan.coolingUntil <= NOW + 15 * 60 * 1000,
    "a transient cooldown must stay within the 15 minute ceiling",
  );
});

await test("planCodexCooldown clamps a retry-after beyond the ceiling", () => {
  const plan = __testHooks.planCodexCooldown(null, 60 * 60 * 1000, NOW);
  assertEqual(
    plan.coolingUntil,
    NOW + 15 * 60 * 1000,
    "an hour-long retry-after must clamp to the transient ceiling",
  );
});

// ---------------------------------------------------------------------------
// Upstream headers
// ---------------------------------------------------------------------------

await test("buildCodexUpstreamHeaders replaces client credentials with the pooled account", () => {
  const headers = __testHooks.buildCodexUpstreamHeaders(
    {
      authorization: "Bearer client-token",
      "x-api-key": "client-key",
      cookie: "session=1",
      "chatgpt-account-id": "client-account",
      "accept-encoding": "gzip",
      "x-keep-me": "yes",
    },
    account("a", { token: "pool-token", accountId: "pool-account" }),
  );

  assertEqual(
    headers.authorization,
    "Bearer pool-token",
    "the pooled account's bearer must replace the caller's",
  );
  assertEqual(
    headers["chatgpt-account-id"],
    "pool-account",
    "the account id must match the pooled bearer, not the caller's",
  );
  for (const blocked of ["x-api-key", "cookie", "accept-encoding"]) {
    assert(
      headers[blocked] === undefined,
      `header must not be forwarded upstream: ${blocked}`,
    );
  }
  assertEqual(
    headers["x-keep-me"],
    "yes",
    "unrelated client headers must pass through",
  );
});

await test("buildCodexUpstreamHeaders defaults identity headers only when absent", () => {
  const supplied = __testHooks.buildCodexUpstreamHeaders(
    {
      "user-agent": "mine",
      originator: "mine-too",
      accept: "application/json",
    },
    account("a"),
  );
  assertEqual(supplied["user-agent"], "mine", "a supplied user-agent must win");
  assertEqual(
    supplied.originator,
    "mine-too",
    "a supplied originator must win",
  );
  assertEqual(
    supplied.accept,
    "application/json",
    "a supplied accept must win",
  );

  const defaulted = __testHooks.buildCodexUpstreamHeaders({}, account("a"));
  assert(
    typeof defaulted["user-agent"] === "string" &&
      defaulted["user-agent"].length > 0,
    "a user-agent must be supplied when the caller omits one",
  );
  assertEqual(
    defaulted.accept,
    "text/event-stream",
    "the streaming accept must be defaulted",
  );
});

// ---------------------------------------------------------------------------
// Quota parsing
// ---------------------------------------------------------------------------

await test("codexRateLimitsToQuota normalizes percentages and resets", () => {
  const quota = codexRateLimitsToQuota(
    {
      primary: { used_percent: 40, resets_in_seconds: 3600 },
      secondary: { used_percent: 100, resets_at: NOW_SECONDS + 86_400 },
    },
    NOW,
  );
  assertEqual(quota.sessionUsed, 0.4, "percentages must become 0-1 fractions");
  assertEqual(
    quota.sessionResetAt,
    NOW_SECONDS + 3600,
    "a relative reset must resolve against the clock",
  );
  assertEqual(
    quota.weeklyStatus,
    "rejected",
    "a fully spent window must read as rejected",
  );
  assertEqual(quota.windows?.length, 2, "both windows must be captured");
});

await test("codexRateLimitsToQuota accepts reset_after as a relative reset", () => {
  // Without this alias a cooldown loses the real reset and degrades to the
  // transient ceiling, which is what re-hammers an exhausted account.
  const quota = codexRateLimitsToQuota(
    { primary: { used_percent: 100, reset_after: 1800 } },
    NOW,
  );
  assertEqual(
    quota.sessionResetAt,
    NOW_SECONDS + 1800,
    "reset_after must resolve to an absolute reset",
  );
});

await test("parseCodexRateLimitHeaders tolerates absent and malformed headers", () => {
  assertEqual(
    parseCodexRateLimitHeaders(new Headers(), NOW),
    null,
    "no rate-limit header must yield no quota",
  );
  assertEqual(
    parseCodexRateLimitHeaders(
      new Headers({ "x-codex-ratelimit": "{not json" }),
      NOW,
    ),
    null,
    "a malformed header must yield no quota rather than throwing",
  );
});

await test("parseCodexRateLimitHeaders reads both the bare and enveloped shapes", () => {
  const bare = parseCodexRateLimitHeaders(
    new Headers({
      "x-codex-ratelimit": JSON.stringify({
        primary: { used_percent: 25 },
      }),
    }),
    NOW,
  );
  assertEqual(bare?.sessionUsed, 0.25, "the bare rate-limit shape must parse");

  const enveloped = parseCodexRateLimitHeaders(
    new Headers({
      "x-codex-active-limit": JSON.stringify({
        rate_limits: { primary: { used_percent: 75 } },
      }),
    }),
    NOW,
  );
  assertEqual(
    enveloped?.sessionUsed,
    0.75,
    "the enveloped rate-limit shape must parse",
  );
});

// ---------------------------------------------------------------------------
// Refresh-failure classification
// ---------------------------------------------------------------------------

await test("only a rejected grant counts as a permanent refresh failure", () => {
  // Getting this wrong disables a working account, and `auth cleanup` then
  // deletes the credential — a network blip must never cost the user a login.
  for (const status of [400, 401, 403]) {
    assert(
      isPermanentCodexRefreshFailure(Object.assign(new Error("x"), { status })),
      `an authorization-server rejection must be permanent: ${status}`,
    );
  }
  for (const status of [500, 502, 503, 504]) {
    assert(
      !isPermanentCodexRefreshFailure(
        Object.assign(new Error("x"), { status }),
      ),
      `a server-side failure must not be permanent: ${status}`,
    );
  }
  assert(
    !isPermanentCodexRefreshFailure(new Error("network timeout")),
    "an error carrying no status must not be permanent",
  );
  assert(
    !isPermanentCodexRefreshFailure(undefined),
    "a missing error must not be permanent",
  );
});

// ---------------------------------------------------------------------------
// Key-space consistency
// ---------------------------------------------------------------------------

await test("stored codex keys stay fully qualified and cannot collide", async () => {
  // Cooldowns and quota live in stores shared with the Anthropic engine, keyed
  // by account. If enumeration ever returned a bare label, a codex account and
  // an anthropic account with the same name would read and write each other's
  // state. Driven through a real TokenStore rather than a hand-built object, so
  // a change in the enumeration path is actually caught.
  const { TokenStore } = await import("../src/lib/auth/tokenStore.js");
  const { CODEX_ACCOUNT_PREFIX } =
    await import("../src/lib/proxy/codexAccountUsage.js");
  const store = new TokenStore({
    encryptionEnabled: false,
    customStoragePath: join(
      mkdtempSync(join(tmpdir(), "neurolink-codex-store-")),
      "tokens.json",
    ),
  });
  const tokens = {
    accessToken: "a",
    refreshToken: "r",
    expiresAt: Date.now() + 3_600_000,
    tokenType: "Bearer" as const,
  };
  await store.saveTokens("codex:alice", tokens);
  await store.saveTokens("anthropic:alice", tokens);

  const codexKeys = await store.listByPrefix(CODEX_ACCOUNT_PREFIX);
  assertEqual(codexKeys.length, 1, "only the codex entry may match the prefix");
  assertEqual(
    codexKeys[0],
    "codex:alice",
    "enumeration must return the fully qualified key",
  );
  assertEqual(
    codexKeys[0].slice(CODEX_ACCOUNT_PREFIX.length),
    "alice",
    "the display label is the key minus exactly its provider prefix",
  );

  const anthropicKeys = await store.listByPrefix("anthropic:");
  assertEqual(
    anthropicKeys.length,
    1,
    "the same bare label under another provider must stay separate",
  );
});

// ---------------------------------------------------------------------------
// Credential import and claim decoding
// ---------------------------------------------------------------------------

/** Build a JWT whose payload carries the OpenAI auth claim, unsigned. */
function fakeCodexJwt(claim: Record<string, unknown>): string {
  const b64 = (o: unknown): string =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64({
    "https://api.openai.com/auth": claim,
  })}.sig`;
}

await test("decodeCodexAccessToken reads the account id and plan from the claim", () => {
  const token = fakeCodexJwt({
    chatgpt_account_id: "acct-123",
    chatgpt_plan_type: "plus",
  });
  const decoded = decodeCodexAccessToken(token);
  assertEqual(decoded.accountId, "acct-123", "the account id must be decoded");
  assertEqual(decoded.planType, "plus", "the plan type must be decoded");
});

await test("token decoding never throws on malformed input", () => {
  // These values arrive from a file on disk, so a parse failure must degrade to
  // "unknown" rather than take down the pool build that calls it per account.
  for (const bad of ["", "not-a-jwt", "a.b", "a.!!!.c"]) {
    const decoded = decodeCodexAccessToken(bad);
    assert(
      decoded.accountId === undefined || typeof decoded.accountId === "string",
      "a malformed token must decode to a defined shape",
    );
  }
  assertEqual(
    resolveCodexAccountId("not-a-jwt"),
    undefined,
    "an unparseable token must resolve to no account id",
  );
  assertEqual(
    resolveCodexAccountId("not-a-jwt", "explicit-id"),
    "explicit-id",
    "an explicitly supplied account id must win over decoding",
  );
});

await test("importCodexAuthFile rejects credentials that cannot be pooled", async () => {
  const dir = mkdtempSync(join(tmpdir(), "neurolink-codex-auth-"));

  const noTokens = join(dir, "no-tokens.json");
  writeFileSync(noTokens, JSON.stringify({ auth_mode: "chatgpt" }));
  let rejected = false;
  try {
    await importCodexAuthFile(noTokens);
  } catch {
    rejected = true;
  }
  assert(rejected, "a file with no access token must be rejected");

  // An API-key login has no subscription to pool, so accepting it would put a
  // credential in the pool that can never serve the subscription endpoint.
  const apiKeyMode = join(dir, "apikey.json");
  writeFileSync(
    apiKeyMode,
    JSON.stringify({
      auth_mode: "apikey",
      tokens: { access_token: fakeCodexJwt({ chatgpt_account_id: "a" }) },
    }),
  );
  rejected = false;
  try {
    await importCodexAuthFile(apiKeyMode);
  } catch {
    rejected = true;
  }
  assert(rejected, "a non-chatgpt auth mode must be rejected");

  const ok = join(dir, "ok.json");
  writeFileSync(
    ok,
    JSON.stringify({
      auth_mode: "chatgpt",
      tokens: {
        access_token: fakeCodexJwt({
          chatgpt_account_id: "acct-9",
          chatgpt_plan_type: "pro",
        }),
        refresh_token: "r",
      },
    }),
  );
  const credential = await importCodexAuthFile(ok);
  assertEqual(
    credential.accountId,
    "acct-9",
    "the account id must survive import",
  );
  assertEqual(credential.planType, "pro", "the plan type must survive import");
});

await test("a proactive refresh runs once for concurrent callers", async () => {
  // OpenAI rotates the refresh token on every call, so simultaneous refreshes
  // invalidate each other and the losers look like a rejected grant — which is
  // what disables an account and gets its credential deleted by auth cleanup.
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 30));
    return new Response(
      JSON.stringify({ access_token: fakeCodexJwt({}), refresh_token: "r2" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof globalThis.fetch;
  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        __testHooks.refreshCodexTokenOnce("codex:shared", "r1"),
      ),
    );
    assertEqual(calls, 1, "five concurrent refreshes must make one token call");
    assert(
      results.every((r) => r.refreshToken === "r2"),
      "every caller must receive the same rotated token",
    );
    assertEqual(
      __testHooks.codexRefreshInFlightSize(),
      0,
      "the in-flight entry must be released after settling",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// Shipped surface
// ---------------------------------------------------------------------------
//
// The cases above drive helpers directly under the determinism exception, so
// they would all still pass if the built package never wired Codex up. These
// drive `node dist/cli/index.js` instead, which is the only thing that proves
// the engine is reachable by a user.

await test("the built CLI exposes codex as an auth provider", async () => {
  const result = await runCLI(["auth", "--help"]);
  assertEqual(result.exitCode, 0, "auth --help must succeed");
  const output = `${result.stdout}${result.stderr}`;
  assert(
    output.includes("login <provider>"),
    "auth --help must list the login subcommand",
  );

  // A provider the CLI does not accept fails validation; codex must not.
  const home = mkdtempSync(join(tmpdir(), "neurolink-codex-cli-"));
  const rejected = await runCLI(["auth", "login", "nosuchprovider"], {
    env: { HOME: home, USERPROFILE: home },
  });
  assert(
    rejected.exitCode !== 0,
    "an unknown provider must be rejected by the built CLI",
  );
});

await test("the built CLI enters the codex import path and reports the missing credential", async () => {
  // An isolated HOME has no ~/.codex/auth.json, so the import path must fail
  // fast with a diagnostic rather than prompting or hanging.
  const home = mkdtempSync(join(tmpdir(), "neurolink-codex-cli-"));
  const result = await runCLI(["auth", "login", "codex"], {
    env: { HOME: home, USERPROFILE: home },
    timeoutMs: 60_000,
  });
  const output = `${result.stdout}${result.stderr}`;

  // Assert the Codex-specific diagnostic, not merely a non-zero exit mentioning
  // "codex": an unregistered provider would fail with "unknown provider: codex"
  // and satisfy a looser check while proving the opposite of what we want.
  assert(
    output.includes(".codex/auth.json"),
    "the CLI must resolve the Codex credential path, proving it entered the import flow",
  );
  assert(
    output.includes("Importing Codex"),
    "the CLI must announce the Codex import step",
  );
  assert(
    !/unknown provider|unsupported provider/i.test(output),
    "codex must be a registered provider on the built CLI",
  );
});

// ---------------------------------------------------------------------------
// Codex SSE usage tap (issue #1369)
//
// The wire shape is verified against live traffic: the fixture case below
// asserts against `test/fixtures/codex-response-usage.sse`, captured from a
// real `codex exec` run through the proxy. These cases pin the parser's
// contract on top of that: recognised shapes yield counts, unrecognised ones
// yield null (never zero), and the tap never alters the bytes it relays.
// ---------------------------------------------------------------------------

await test("codex usage tap bounds a stream with no line breaks", async () => {
  // A hung upstream, or a non-SSE body relayed by mistake, can send bytes
  // forever without a newline. The tap keeps the unterminated tail so the next
  // chunk can complete the line, so without a ceiling that buffer grows for the
  // life of the request — in the hot path of a live relay.
  const { createCodexUsageTap } =
    await import("../src/lib/proxy/codexUsage.js");
  const { stream, usage } = createCodexUsageTap();
  const encoder = new TextEncoder();
  const blob = encoder.encode("x".repeat(256 * 1024));

  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  let relayed = 0;
  const drain = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      relayed += value.byteLength;
    }
  })();
  for (let i = 0; i < 12; i += 1) {
    await writer.write(blob);
  }
  await writer.close();
  await drain;

  // Every byte still reaches the client — the tap must never hold one back.
  assert(
    relayed === blob.byteLength * 12,
    "usage tap did not relay every byte of a line-break-free stream",
  );
  assert((await usage) === null, "usage tap invented a reading from noise");
});

await test("codex usage tap reads the documented response.completed shape", async () => {
  const { scanCodexSSEForUsage } =
    await import("../src/lib/proxy/codexUsage.js");
  const usage = scanCodexSSEForUsage(
    [
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"hi"}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"usage":{"input_tokens":1200,"output_tokens":340,"input_tokens_details":{"cached_tokens":900},"output_tokens_details":{"reasoning_tokens":128}}}}',
      "",
    ].join("\n"),
  );
  assert(usage !== null, "usage was not recognised in the documented shape");
  assertEqual(usage?.inputTokens, 1200, "input token count mismatch");
  assertEqual(usage?.outputTokens, 340, "output token count mismatch");
  assertEqual(usage?.cacheReadTokens, 900, "cache-read token count mismatch");
  assertEqual(usage?.reasoningTokens, 128, "reasoning token count mismatch");
});

await test("codex usage tap reports null rather than zero when unrecognised", async () => {
  const { scanCodexSSEForUsage } =
    await import("../src/lib/proxy/codexUsage.js");
  const noUsage = scanCodexSSEForUsage(
    [
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"hi"}',
      "data: [DONE]",
      "",
    ].join("\n"),
  );
  assert(
    noUsage === null,
    "a stream with no usage must report null, not a zeroed object",
  );
});

await test("codex usage tap survives malformed and partial payloads", async () => {
  const { scanCodexSSEForUsage } =
    await import("../src/lib/proxy/codexUsage.js");
  const usage = scanCodexSSEForUsage(
    [
      "data: {not json at all",
      'data: {"type":"response.completed","response":{"usa',
      'data: {"usage":{"prompt_tokens":10,"completion_tokens":5}}',
      "",
    ].join("\n"),
  );
  assert(usage !== null, "the alternate token spelling was not recognised");
  assertEqual(usage?.inputTokens, 10, "prompt_tokens was not mapped to input");
  assertEqual(
    usage?.outputTokens,
    5,
    "completion_tokens was not mapped to output",
  );
});

await test("codex usage tap relays every byte unchanged", async () => {
  const { createCodexUsageTap } =
    await import("../src/lib/proxy/codexUsage.js");
  const payload =
    'event: response.completed\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":7,"output_tokens":3}}}\n\n';
  const { stream, usage } = createCodexUsageTap();

  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(payload);
      // Split mid-event to prove the tap reassembles across chunk boundaries
      // without withholding or reordering bytes.
      controller.enqueue(bytes.slice(0, 40));
      controller.enqueue(bytes.slice(40));
      controller.close();
    },
  });

  const relayed: Uint8Array[] = [];
  const reader = source.pipeThrough(stream).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    relayed.push(value);
  }
  const out = new TextDecoder().decode(
    new Uint8Array(relayed.flatMap((c) => Array.from(c))),
  );
  assertEqual(out, payload, "relayed bytes differ from the upstream payload");

  const seen = await usage;
  assert(seen !== null, "usage was not recovered across the chunk split");
  assertEqual(seen?.inputTokens, 7, "input token count mismatch after split");
});

await test("codex usage tap captures a raw sample when opted in", async () => {
  const fsMod = await import("fs");
  const osMod = await import("os");
  const pathMod = await import("path");
  const { createCodexUsageTap } =
    await import("../src/lib/proxy/codexUsage.js");

  const dir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), "codex-cap-"));
  const target = pathMod.join(dir, "sample.sse");
  const prev = process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
  try {
    process.env.NEUROLINK_PROXY_CODEX_CAPTURE = target;
    const payload =
      'event: response.completed\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":9,"output_tokens":4}}}\n\n';
    const { stream, usage } = createCodexUsageTap();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const reader = source.pipeThrough(stream).getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }
    await usage;

    assert(
      fsMod.existsSync(target),
      "capture file was not written when opted in",
    );
    const written = fsMod.readFileSync(target, "utf8");
    assertEqual(
      written,
      payload,
      "captured bytes differ from the relayed payload",
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
    } else {
      process.env.NEUROLINK_PROXY_CODEX_CAPTURE = prev;
    }
    fsMod.rmSync(dir, { recursive: true, force: true });
  }
});

await test("codex usage tap writes nothing when capture is not opted in", async () => {
  const fsMod = await import("fs");
  const osMod = await import("os");
  const pathMod = await import("path");
  const { createCodexUsageTap } =
    await import("../src/lib/proxy/codexUsage.js");

  const dir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), "codex-nocap-"));
  const target = pathMod.join(dir, "sample.sse");
  const prev = process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
  try {
    delete process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
    const { stream, usage } = createCodexUsageTap();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {}\n\n"));
        controller.close();
      },
    });
    const reader = source.pipeThrough(stream).getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }
    await usage;
    assert(
      !fsMod.existsSync(target),
      "capture file was created without the opt-in env var",
    );
  } finally {
    if (prev !== undefined) {
      process.env.NEUROLINK_PROXY_CODEX_CAPTURE = prev;
    }
    fsMod.rmSync(dir, { recursive: true, force: true });
  }
});

await test("codex usage tap settles its promise when the stream is aborted", async () => {
  const { createCodexUsageTap } =
    await import("../src/lib/proxy/codexUsage.js");
  const { stream, usage } = createCodexUsageTap();

  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"partial":true}\n'));
    },
  });

  const piped = source.pipeThrough(stream);
  const reader = piped.getReader();
  await reader.read();
  // Client hangs up mid-response — the normal case for a proxy: timeouts and
  // disconnects abort rather than close cleanly, so flush() never runs.
  await reader.cancel(new Error("client disconnected")).catch(() => undefined);

  const settled = await Promise.race([
    usage.then(() => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 2000)),
  ]);
  assertEqual(
    settled,
    "settled",
    "usage promise did not settle after an aborted stream",
  );
});

await test("codex usage tap parses a stream captured from real traffic", async () => {
  const fsMod = await import("fs");
  const { scanCodexSSEForUsage } =
    await import("../src/lib/proxy/codexUsage.js");
  // Captured from a real `codex exec` run through the proxy on 2026-08-21 and
  // trimmed to the usage envelope. This is what promotes the parser from
  // written-to-spec to verified.
  const fixture = fsMod.readFileSync(
    new URL("./fixtures/codex-response-usage.sse", import.meta.url),
    "utf8",
  );
  const usage = scanCodexSSEForUsage(fixture);
  assert(usage !== null, "usage was not recognised in real captured traffic");
  assertEqual(usage?.inputTokens, 17339, "input token count mismatch");
  assertEqual(usage?.outputTokens, 7, "output token count mismatch");
  assertEqual(usage?.cacheReadTokens, 8576, "cache-read token count mismatch");
  assertEqual(usage?.reasoningTokens, 0, "reasoning token count mismatch");
});

await test("codex usage tap records cache-creation tokens", async () => {
  const { extractCodexUsage } = await import("../src/lib/proxy/codexUsage.js");
  // Real streams carry input_tokens_details.cache_write_tokens alongside
  // cached_tokens. Cache writes bill at a premium, so dropping them
  // under-reports cost.
  const usage = extractCodexUsage({
    type: "response.completed",
    response: {
      usage: {
        input_tokens: 100,
        output_tokens: 10,
        input_tokens_details: { cached_tokens: 40, cache_write_tokens: 25 },
      },
    },
  });
  assert(usage !== null, "usage was not recognised");
  assertEqual(usage?.cacheCreationTokens, 25, "cache-creation tokens dropped");
  assertEqual(usage?.cacheReadTokens, 40, "cache-read token count mismatch");
});

await test("codex capture holds its byte cap against a single oversized chunk", async () => {
  // The capture is opt-in debugging that writes the assistant's real response
  // to disk, so its cap is the thing keeping a long stream from filling an
  // operator's filesystem. The guard only checked whether the cap had ALREADY
  // been reached before appending a whole chunk, so one large chunk arriving
  // just under the limit landed in full.
  //
  // One chunk, far larger than the cap, is the smallest case that
  // distinguishes a per-write cap from a per-stream one.
  const os = await import("node:os");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-capture-"));
  const target = path.join(dir, "capture.sse");
  const prior = process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
  process.env.NEUROLINK_PROXY_CODEX_CAPTURE = target;
  try {
    const { createCodexUsageTap } =
      await import("../src/lib/proxy/codexUsage.js");
    const { stream, usage } = createCodexUsageTap();
    const huge = new Uint8Array(2 * 1024 * 1024).fill(120);
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(huge);
        controller.close();
      },
    });
    let relayed = 0;
    const reader = readable.pipeThrough(stream).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      relayed += value.byteLength;
    }
    await usage;
    const size = fs.statSync(target).size;
    console.log(
      `    [diagnostic] capture cap: file=${size} relayed=${relayed}`,
    );
    assert(
      size <= 256 * 1024,
      `the capture file grew past its cap, reaching ${size} bytes`,
    );
    // The relay is the contract that must not bend: capping what is written to
    // disk must never cost the client bytes.
    assertEqual(
      relayed,
      huge.byteLength,
      "capping the capture file also truncated the relayed stream",
    );
  } finally {
    if (prior === undefined) {
      delete process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
    } else {
      process.env.NEUROLINK_PROXY_CODEX_CAPTURE = prior;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Claude -> Codex fallback wire bridge
// ---------------------------------------------------------------------------

await test("Claude fallback converts system, history, tools, and tool results", () => {
  const request = convertClaudeRequestToCodex(
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 777,
      system: [
        { type: "text", text: "Follow the system policy." },
        { type: "text", text: "Return concise answers." },
      ],
      temperature: 0.3,
      top_p: 0.8,
      messages: [
        { role: "user", content: "Find the release status." },
        {
          role: "assistant",
          content: [
            { type: "text", text: "I will look it up." },
            {
              type: "tool_use",
              id: "toolu_lookup",
              name: "lookup_release",
              input: { branch: "release" },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_lookup",
              content: "release is healthy",
            },
            { type: "text", text: "Summarize that result." },
          ],
        },
      ],
      tools: [
        {
          name: "lookup_release",
          description: "Read release status.",
          input_schema: {
            type: "object",
            properties: { branch: { type: "string" } },
            required: ["branch"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "lookup_release" },
    },
    "gpt-5.6-terra",
  );

  assertEqual(request.model, "gpt-5.6-terra", "fallback model was not used");
  assertEqual(request.store, false, "Codex backend requires store=false");
  assertEqual(request.stream, true, "fallback must buffer an SSE response");
  assertEqual(
    request.instructions,
    "Follow the system policy.\n\nReturn concise answers.",
    "system blocks were not preserved as Codex instructions",
  );
  assert(
    !("max_output_tokens" in request),
    "Anthropic max_tokens must not reach the Codex backend",
  );
  assert(
    !("temperature" in request),
    "Anthropic temperature must not reach the Codex backend",
  );
  assert(
    !("top_p" in request),
    "Anthropic top_p must not reach the Codex backend",
  );
  assertEqual(
    JSON.stringify(request.tool_choice),
    JSON.stringify({ type: "function", name: "lookup_release" }),
    "named tool choice was not translated",
  );
  assertEqual(
    request.tools?.[0]?.type,
    "function",
    "tool type was not translated",
  );
  assertEqual(
    (request.tools?.[0]?.parameters.required as string[] | undefined)?.[0],
    "branch",
    "tool schema was not preserved",
  );
  assertEqual(request.input.length, 5, "conversation items were not preserved");
  assertEqual(
    (request.input[1] as { role?: string }).role,
    "assistant",
    "assistant history lost its role",
  );
  assertEqual(
    (request.input[2] as { type?: string }).type,
    "function_call",
    "assistant tool use was not translated",
  );
  assertEqual(
    (request.input[3] as { type?: string }).type,
    "function_call_output",
    "tool result was not translated",
  );
  assertEqual(
    (request.input[3] as { call_id?: string }).call_id,
    "toolu_lookup",
    "tool result no longer matches the prior tool call",
  );
});

await test("Claude fallback maps automatic and required tool choices", () => {
  const base = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 64,
    messages: [{ role: "user" as const, content: "Use a tool." }],
  };
  const auto = convertClaudeRequestToCodex(
    { ...base, tool_choice: { type: "auto" } },
    "gpt-5.6-terra",
  );
  const required = convertClaudeRequestToCodex(
    { ...base, tool_choice: { type: "any" } },
    "gpt-5.6-terra",
  );
  const none = convertClaudeRequestToCodex(
    { ...base, tool_choice: { type: "none" } },
    "gpt-5.6-terra",
  );
  assertEqual(auto.tool_choice, "auto", "automatic tool choice changed");
  assertEqual(
    required.tool_choice,
    "required",
    "required tool choice was not translated",
  );
  assertEqual(none.tool_choice, "none", "disabled tool choice changed");
});

await test("Codex fallback parses text SSE and usage only after completion", () => {
  const parsed = parseCodexFallbackSSE(
    [
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"Hello "}',
      "",
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"world"}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":12,"output_tokens":5,"input_tokens_details":{"cached_tokens":3,"cache_write_tokens":2}}}}',
      "",
    ].join("\n"),
  );
  assertEqual(parsed.text, "Hello world", "text deltas were not joined");
  assertEqual(parsed.finishReason, "end_turn", "text finish reason changed");
  assertEqual(parsed.usage?.input, 12, "input usage was not read");
  assertEqual(parsed.usage?.output, 5, "output usage was not read");
  assertEqual(
    parsed.usage?.cacheReadTokens,
    3,
    "cache-read usage was not read",
  );
  assertEqual(
    parsed.usage?.cacheCreationTokens,
    2,
    "cache-creation usage was not read",
  );
});

await test("Codex fallback ignores unrecognized SSE extension fields", () => {
  const parsed = parseCodexFallbackSSE(
    [
      "event: response.output_text.delta",
      "trace: upstream-extension",
      "field-without-a-value",
      'data: {"type":"response.output_text.delta","delta":"Hello"}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":1,"output_tokens":1}}}',
      "",
    ].join("\n"),
  );
  assertEqual(
    parsed.text,
    "Hello",
    "extension fields discarded a valid response",
  );
});

await test("Codex fallback parses completed function calls", () => {
  const parsed = parseCodexFallbackSSE(
    [
      "event: response.output_item.done",
      'data: {"type":"response.output_item.done","item":{"type":"function_call","call_id":"call_123","name":"lookup_release","arguments":"{\\"branch\\":\\"release\\"}"}}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":9,"output_tokens":4}}}',
      "",
    ].join("\n"),
  );
  assertEqual(parsed.text, "", "tool-only response invented text");
  assertEqual(parsed.finishReason, "tool_use", "tool finish reason changed");
  assertEqual(parsed.toolCalls.length, 1, "function call was not captured");
  assertEqual(
    parsed.toolCalls[0]?.toolCallId,
    "call_123",
    "function call id was not preserved",
  );
  assertEqual(
    parsed.toolCalls[0]?.args.branch as string,
    "release",
    "function call arguments were not parsed",
  );
});

await test("Codex fallback recovers final text when delta events are absent", () => {
  const parsed = parseCodexFallbackSSE(
    [
      "event: response.output_item.done",
      'data: {"type":"response.output_item.done","item":{"type":"message","content":[{"type":"output_text","text":"final answer"}]}}',
      "",
      "event: response.completed",
      'data: {"type":"response.completed","response":{"status":"completed"}}',
      "",
    ].join("\n"),
  );
  assertEqual(
    parsed.text,
    "final answer",
    "completed message text was not used as a fallback",
  );
});

await test("Codex fallback rejects empty, malformed, and incomplete streams", () => {
  const cases = [
    [
      "empty",
      [
        "event: response.completed",
        'data: {"type":"response.completed","response":{"status":"completed"}}',
        "",
      ].join("\n"),
    ],
    [
      "malformed",
      ["event: response.output_text.delta", "data: {not-json}", ""].join("\n"),
    ],
    [
      "incomplete",
      [
        "event: response.output_text.delta",
        'data: {"type":"response.output_text.delta","delta":"partial"}',
        "",
      ].join("\n"),
    ],
  ] as const;
  for (const [name, stream] of cases) {
    let rejected = false;
    try {
      parseCodexFallbackSSE(stream);
    } catch {
      rejected = true;
    }
    assert(rejected, `${name} Codex stream was treated as a success`);
  }
});

await test("Codex fallback consumes non-success responses before rejecting", async () => {
  const response = new Response('{"error":{"message":"quota exhausted"}}', {
    status: 429,
    headers: { "content-type": "application/json" },
  });
  let rejected = false;
  try {
    await consumeCodexFallbackResponse(response);
  } catch {
    rejected = true;
  }
  assert(rejected, "non-success Codex response was treated as a success");
  assert(response.bodyUsed, "non-success Codex response body was not consumed");
});

await test("an unavailable Anthropic model remains eligible for configured fallback", async () => {
  const account = {
    key: "anthropic:legacy@example.com",
    label: "legacy@example.com",
    token: "test-token",
    type: "oauth" as const,
  };
  const run = (
    allowConfiguredModelFallback: boolean,
    message = "model: claude-3-5-sonnet",
  ) =>
    claudeProxyTestHooks.handleAnthropicNonOkResponse({
      response: new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "not_found_error",
            message,
          },
        }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
      account: account as never,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      } as never,
      enabledAccounts: [account] as never,
      orderedAccounts: [account] as never,
      requestStartTime: Date.now(),
      fetchStartMs: Date.now(),
      attemptNumber: 1,
      logAttempt: () => undefined,
      logProxyBody: () => undefined,
      logFinalRequest: () => undefined,
      lastError: undefined,
      authFailureMessage: null,
      sawTransientFailure: false,
      invalidRequestFailure: null,
      entitlementFailure: null,
      allowConfiguredModelFallback,
    });

  const fallbackEligible = await run(true);
  assertEqual(
    fallbackEligible.continueLoop,
    false,
    "model-not-found should end the Anthropic account loop",
  );
  assertEqual(
    fallbackEligible.response,
    undefined,
    "model-not-found should reach the configured fallback",
  );
  assertEqual(
    fallbackEligible.invalidRequestFailure,
    null,
    "model-not-found should not suppress configured fallback",
  );

  const terminal = await run(false);
  const terminalError = terminal.response as {
    type?: string;
    error?: { type?: string };
  };
  if (!terminalError) {
    throw new Error("unconfigured model-not-found did not remain terminal");
  }
  assertEqual(
    terminalError.type,
    "error",
    "unconfigured model-not-found did not retain Claude error shape",
  );
  assertEqual(
    terminalError.error?.type,
    "not_found_error",
    "unconfigured model-not-found did not retain error type",
  );

  const unrelated = await run(true, "resource: missing-file");
  const unrelatedError = unrelated.response as {
    type?: string;
    error?: { type?: string };
  };
  if (!unrelatedError) {
    throw new Error("unrelated 404 did not remain terminal");
  }
  assertEqual(
    unrelatedError.error?.type,
    "not_found_error",
    "configured fallback captured an unrelated 404",
  );
});

await test("Codex fallback preserves a request error without an Anthropic cooldown", async () => {
  const responseBody = JSON.stringify({
    error: {
      type: "invalid_request_error",
      message: "The image data you provided does not represent a valid image.",
    },
  });
  const invalidRequestFailure =
    claudeProxyTestHooks.getCodexFallbackInvalidRequestFailure(
      new CodexFallbackResponseError(400, responseBody),
    );
  assert(invalidRequestFailure !== null, "Codex 400 was not retained");
  assertEqual(
    claudeProxyTestHooks.getCodexFallbackInvalidRequestFailure(
      new CodexFallbackResponseError(429, responseBody),
    ),
    null,
    "Codex quota errors must not be treated as invalid requests",
  );

  const result = claudeProxyTestHooks.buildClaudeAnthropicFailureResponse({
    tracer: undefined,
    requestStartTime: Date.now(),
    authFailureMessage: null,
    authCooldownMessage: null,
    invalidRequestFailure,
    entitlementFailure: null,
    scopedExhaustion: null,
    sawNetworkError: false,
    sawTransientFailure: false,
    sawRateLimit: false,
    lastError: undefined,
    orderedAccounts: [],
    buildLoggedClaudeError: (() => {
      throw new Error("invalid request should build a direct HTTP response");
    }) as never,
    logProxyBody: () => undefined,
    logFinalRequest: () => undefined,
  });
  if (!(result instanceof Response)) {
    throw new Error("invalid request did not retain HTTP status");
  }
  assertEqual(result.status, 400, "Codex 400 was rewritten unexpectedly");
  const body = (await result.json()) as {
    type?: string;
    error?: { type?: string; message?: string };
  };
  assertEqual(body.type, "error", "response was not Claude-compatible");
  assertEqual(
    body.error?.type,
    "invalid_request_error",
    "response did not retain invalid_request_error",
  );
  assert(
    body.error?.message?.includes("does not represent a valid image") === true,
    "response did not retain the Codex validation message",
  );
});

await test("Claude invalid requests retain structured upstream error details", async () => {
  const responseBody = JSON.stringify({
    type: "error",
    error: {
      type: "invalid_request_error",
      message: `The invalid field is messages[0].content: ${"x".repeat(220)}`,
      details: { error_code: "invalid_field" },
    },
  });
  const result = claudeProxyTestHooks.buildClaudeAnthropicFailureResponse({
    tracer: undefined,
    requestStartTime: Date.now(),
    authFailureMessage: null,
    authCooldownMessage: null,
    invalidRequestFailure: {
      status: 400,
      body: responseBody,
      contentType: "application/vnd.anthropic+json; charset=utf-8",
    },
    entitlementFailure: null,
    scopedExhaustion: null,
    sawNetworkError: false,
    sawTransientFailure: false,
    sawRateLimit: false,
    lastError: undefined,
    orderedAccounts: [],
    buildLoggedClaudeError: (() => {
      throw new Error("invalid request should build a direct HTTP response");
    }) as never,
    logProxyBody: () => undefined,
    logFinalRequest: () => undefined,
  });
  if (!(result instanceof Response)) {
    throw new Error("invalid request did not retain HTTP status");
  }
  assertEqual(result.status, 400, "invalid request did not retain HTTP status");
  assertEqual(
    result.headers.get("content-type"),
    "application/vnd.anthropic+json; charset=utf-8",
    "invalid request did not retain the upstream content type",
  );
  assertEqual(
    await result.text(),
    responseBody,
    "invalid request discarded structured upstream error detail",
  );
});

await test("Anthropic cooldown wins over a Codex fallback request error", async () => {
  const invalidRequestFailure =
    claudeProxyTestHooks.getCodexFallbackInvalidRequestFailure(
      new CodexFallbackResponseError(
        400,
        JSON.stringify({ error: { message: "invalid converted request" } }),
      ),
    );
  assert(invalidRequestFailure !== null, "Codex 400 was not retained");

  const result = claudeProxyTestHooks.buildClaudeAnthropicFailureResponse({
    tracer: undefined,
    requestStartTime: Date.now(),
    authFailureMessage: null,
    authCooldownMessage: null,
    invalidRequestFailure,
    entitlementFailure: null,
    scopedExhaustion: null,
    sawNetworkError: false,
    sawTransientFailure: false,
    sawRateLimit: true,
    lastError: undefined,
    orderedAccounts: [],
    buildLoggedClaudeError: (() => {
      throw new Error("rate limit should build a direct HTTP response");
    }) as never,
    logProxyBody: () => undefined,
    logFinalRequest: () => undefined,
  });
  if (!(result instanceof Response)) {
    throw new Error("rate limit did not retain HTTP status");
  }
  assertEqual(result.status, 429, "Codex 400 masked the Anthropic cooldown");
  const body = (await result.json()) as {
    type?: string;
    error?: { type?: string };
  };
  assertEqual(body.type, "error", "response was not Claude-compatible");
  assertEqual(
    body.error?.type,
    "overloaded_error",
    "response did not retain rate-limit semantics",
  );
});

await runSuite();
