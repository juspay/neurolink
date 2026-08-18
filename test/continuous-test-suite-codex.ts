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
} from "../src/lib/proxy/codexAccountUsage.js";
import { __testHooks } from "../src/lib/server/routes/codexProxyRoutes.js";
import type { CodexRuntimeAccount } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite, runCLI } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Codex Pool Engine");

/** Fixed clock so reset arithmetic is deterministic. */
const NOW = 1_800_000_000_000;
const NOW_SECONDS = Math.floor(NOW / 1000);

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

await runSuite();
