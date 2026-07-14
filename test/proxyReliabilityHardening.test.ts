import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenStore } from "../src/lib/auth/tokenStore.js";
import {
  anthropicAccountKeysEqual,
  createAccountAllowlist,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  shouldLoadFallbackCredential,
} from "../src/lib/proxy/accountSelection.js";
import {
  clearAccountCooldown,
  initAccountCooldown,
  loadAccountCooldowns,
  saveAccountCooldown,
} from "../src/lib/proxy/accountCooldown.js";
import {
  flushAccountQuotaStateForTests,
  getUnifiedRateLimitStatus,
  initAccountQuota,
  loadAccountQuotas,
  parseQuotaHeaders,
  saveAccountQuota,
} from "../src/lib/proxy/accountQuota.js";
import { resolveProxyPaths } from "../src/lib/proxy/proxyPaths.js";
import { createSSEInterceptor } from "../src/lib/proxy/sseInterceptor.js";
import {
  clearRefreshStateForTests,
  needsRefresh,
  refreshToken,
} from "../src/lib/proxy/tokenRefresh.js";
import {
  createStreamTerminalOutcomeTracker,
  mergeStreamTerminalOutcome,
} from "../src/lib/proxy/streamOutcome.js";
import { parseProxyConfigString } from "../src/lib/proxy/proxyConfig.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  clearRefreshStateForTests();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
  __testHooks.resetAllRuntimeState();
});

describe("authoritative unified rate-limit handling", () => {
  it("rotates immediately when unified is rejected but 5h and 7d are allowed", () => {
    const now = 1_800_000_000_000;
    const retryAfterMs = 12 * 60 * 60 * 1000;
    const headers = new Headers({
      "anthropic-ratelimit-unified-status": "rejected",
      "anthropic-ratelimit-unified-5h-status": "allowed",
      "anthropic-ratelimit-unified-5h-utilization": "0.42",
      "anthropic-ratelimit-unified-5h-reset": String(now / 1000 + 3600),
      "anthropic-ratelimit-unified-7d-status": "allowed",
      "anthropic-ratelimit-unified-7d-utilization": "0.63",
      "anthropic-ratelimit-unified-7d-reset": String(now / 1000 + 86400),
    });

    const quota = parseQuotaHeaders(headers);
    expect(quota?.unifiedStatus).toBe("rejected");
    expect(getUnifiedRateLimitStatus(headers)).toBe("rejected");
    expect(
      __testHooks.planCooldownFor429(
        quota,
        retryAfterMs,
        now,
        getUnifiedRateLimitStatus(headers),
      ),
    ).toEqual({
      reason: "unified",
      coolingUntil: now + retryAfterMs,
      rotateImmediately: true,
    });
  });

  it("does not classify a normal allowed response as unified exhaustion", () => {
    const headers = {
      "Anthropic-RateLimit-Unified-Status": " allowed ",
    };
    expect(getUnifiedRateLimitStatus(headers)).toBe("allowed");
  });
});

describe("cooldown persistence", () => {
  it("restores a cooldown after module state is reset and clears it conditionally", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-"));
    tempDirs.push(dir);
    const file = join(dir, "account-cooldowns.json");
    const coolingUntil = Date.now() + 60_000;

    initAccountCooldown(file);
    initAccountQuota(join(dir, "account-quotas.json"));
    await saveAccountCooldown("anthropic:a", coolingUntil, "unified");

    initAccountCooldown(file);
    expect(await loadAccountCooldowns()).toMatchObject({
      "anthropic:a": { coolingUntil, reason: "unified" },
    });
    await __testHooks.seedRuntimeQuotasFromDisk([
      {
        key: "anthropic:a",
        label: "a",
        token: "test-token",
        type: "oauth",
      },
    ]);
    expect(__testHooks.getAccountRuntimeState("anthropic:a")).toMatchObject({
      coolingUntil,
      coolingReason: "unified",
    });

    await clearAccountCooldown("anthropic:a", coolingUntil + 1);
    expect(await loadAccountCooldowns()).toHaveProperty("anthropic:a");
    await clearAccountCooldown("anthropic:a", coolingUntil);
    expect(await loadAccountCooldowns()).not.toHaveProperty("anthropic:a");
  });

  it("preserves concurrent first writes while the persisted cache loads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-race-"));
    tempDirs.push(dir);
    initAccountCooldown(join(dir, "account-cooldowns.json"));
    const now = Date.now();

    await Promise.all([
      saveAccountCooldown("anthropic:a", now + 60_000, "session"),
      saveAccountCooldown("anthropic:b", now + 120_000, "weekly"),
    ]);

    expect(await loadAccountCooldowns()).toMatchObject({
      "anthropic:a": { coolingUntil: now + 60_000 },
      "anthropic:b": { coolingUntil: now + 120_000 },
    });
  });

  it("serializes cooldown extensions and conditional clears on disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-order-"));
    tempDirs.push(dir);
    const file = join(dir, "account-cooldowns.json");
    initAccountCooldown(file);
    const initialCoolingUntil = Date.now() + 60_000;
    const extendedCoolingUntil = initialCoolingUntil + 120_000;

    await saveAccountCooldown("anthropic:a", initialCoolingUntil, "session");
    await Promise.all([
      saveAccountCooldown("anthropic:a", extendedCoolingUntil, "weekly"),
      clearAccountCooldown("anthropic:a", initialCoolingUntil),
      saveAccountCooldown("anthropic:a", initialCoolingUntil + 30_000, "auth"),
    ]);

    const persisted = JSON.parse(await readFile(file, "utf8"));
    expect(persisted["anthropic:a"]).toMatchObject({
      coolingUntil: extendedCoolingUntil,
      reason: "weekly",
    });
  });

  it("preserves concurrent first quota updates while the cache loads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-quota-race-"));
    tempDirs.push(dir);
    initAccountQuota(join(dir, "account-quotas.json"));
    const quota = {
      sessionUsed: 0.1,
      sessionStatus: "allowed",
      sessionResetAt: 0,
      weeklyUsed: 0.2,
      weeklyStatus: "allowed",
      weeklyResetAt: 0,
      fallbackPercentage: 0,
      overageStatus: "unknown",
      lastUpdated: Date.now(),
    };

    await Promise.all([
      saveAccountQuota("anthropic:a", quota),
      saveAccountQuota("anthropic:b", { ...quota, sessionUsed: 0.3 }),
    ]);

    expect(await loadAccountQuotas()).toMatchObject({
      "anthropic:a": { sessionUsed: 0.1 },
      "anthropic:b": { sessionUsed: 0.3 },
    });
    await flushAccountQuotaStateForTests();
    const persisted = JSON.parse(
      await readFile(join(dir, "account-quotas.json"), "utf8"),
    );
    expect(persisted).toMatchObject({
      "anthropic:a": { sessionUsed: 0.1 },
      "anthropic:b": { sessionUsed: 0.3 },
    });
  });
});

describe("refresh failure classification", () => {
  it("uses the shared five-minute expiry buffer", () => {
    expect(
      needsRefresh({
        token: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 6 * 60 * 1000,
        label: "account",
      }),
    ).toBe(false);
    expect(
      needsRefresh({
        token: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 4 * 60 * 1000,
        label: "account",
      }),
    ).toBe(true);
  });

  it("only treats rejected refresh credentials as permanent", () => {
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 400 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 401 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 404 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 429 }),
    ).toBe(false);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 503 }),
    ).toBe(false);
    expect(__testHooks.isPermanentRefreshFailure({ success: false })).toBe(
      false,
    );
  });

  it("preserves a stale-token 404 when the fallback endpoint is down", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockRejectedValueOnce(new Error("fallback endpoint unavailable"));

    const result = await refreshToken({
      token: "expired",
      refreshToken: "invalid",
      label: "account-a",
    });
    expect(result).toMatchObject({ success: false, status: 404 });
    expect(__testHooks.isPermanentRefreshFailure(result)).toBe(true);
  });

  it("keeps refresh endpoint 429 and 5xx failures transient", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));

    const result = await refreshToken({
      token: "expired",
      refreshToken: "still-valid",
      label: "account-b",
    });
    expect(result).toMatchObject({ success: false, status: 503 });
    expect(__testHooks.isPermanentRefreshFailure(result)).toBe(false);
  });

  it("serializes concurrent rotating-token refreshes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const first = {
      token: "old-access-a",
      refreshToken: "shared-old-refresh",
      label: "account-a",
    };
    const second = {
      token: "old-access-b",
      refreshToken: "shared-old-refresh",
      label: "account-b",
    };

    const results = await Promise.all([
      refreshToken(first),
      refreshToken(second),
    ]);

    expect(results).toEqual([{ success: true }, { success: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });
    expect(second).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });

    const rotatedTokenCaller = {
      token: "stale-access",
      refreshToken: "new-refresh",
      label: "account-a-reloaded",
    };
    expect(await refreshToken(rotatedTokenCaller)).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rotatedTokenCaller).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });
  });
});

describe("account restriction", () => {
  it("normalizes an explicit allowlist and denies every unlisted source", () => {
    const allowlist = createAccountAllowlist([
      " primary@example.com ",
      "anthropic:PRIMARY@example.com",
    ]);

    expect([...allowlist!]).toEqual(["anthropic:primary@example.com"]);
    expect(isAccountAllowed("primary@example.com", allowlist)).toBe(true);
    expect(isAccountAllowed("anthropic:other@example.com", allowlist)).toBe(
      false,
    );
    expect(isAccountAllowed(LEGACY_ANTHROPIC_ACCOUNT_KEY, allowlist)).toBe(
      false,
    );
    expect(isAccountAllowed(ENV_ANTHROPIC_ACCOUNT_KEY, allowlist)).toBe(false);
    expect(
      anthropicAccountKeysEqual(
        "anthropic:PRIMARY@example.com",
        "primary@example.com",
      ),
    ).toBe(true);
  });

  it("distinguishes an absent allowlist from an explicit deny-all list", () => {
    expect(isAccountAllowed("anthropic:any", undefined)).toBe(true);
    expect(isAccountAllowed("anthropic:any", createAccountAllowlist([]))).toBe(
      false,
    );
  });

  it("never activates hidden fallback credentials while token-store accounts exist", () => {
    expect(
      shouldLoadFallbackCredential(1, LEGACY_ANTHROPIC_ACCOUNT_KEY, undefined),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        1,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["legacy-default"]),
      ),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        0,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["primary@example.com"]),
      ),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        0,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["legacy-default"]),
      ),
    ).toBe(true);
  });

  it("parses and validates account-allowlist without failing open", async () => {
    const config = await parseProxyConfigString(
      JSON.stringify({
        routing: {
          "account-allowlist": [" primary@example.com ", "anthropic:other"],
        },
      }),
    );
    expect(config.routing?.accountAllowlist).toEqual([
      "primary@example.com",
      "anthropic:other",
    ]);

    await expect(
      parseProxyConfigString(
        JSON.stringify({ routing: { "account-allowlist": "hello" } }),
      ),
    ).rejects.toThrow("account-allowlist must be an array");
  });

  it("preserves manual disable metadata across automatic token saves", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-token-store-"));
    tempDirs.push(dir);
    const store = new TokenStore({
      encryptionEnabled: false,
      customStoragePath: join(dir, "tokens.json"),
    });
    const key = "anthropic:disabled@example.com";
    await store.saveTokens(key, {
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: Date.now() + 60_000,
      tokenType: "Bearer",
    });
    await store.markDisabled(key, "manual_single_account_routing");
    await store.saveTokens(key, {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: Date.now() + 120_000,
      tokenType: "Bearer",
    });

    expect(await store.isDisabled(key)).toBe(true);
    expect(await store.getDisabledReason(key)).toBe(
      "manual_single_account_routing",
    );
    expect(await store.loadTokens(key)).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    await store.markEnabled(key);
    await Promise.all([
      store.saveTokens(key, {
        accessToken: "concurrent-access",
        refreshToken: "concurrent-refresh",
        expiresAt: Date.now() + 180_000,
        tokenType: "Bearer",
      }),
      store.markDisabled(key, "concurrent_operator_disable"),
    ]);
    expect(await store.isDisabled(key)).toBe(true);
    expect(await store.getDisabledReason(key)).toBe(
      "concurrent_operator_disable",
    );
  });
});

describe("stream terminal outcomes", () => {
  it("preserves the first terminal outcome", async () => {
    const tracker = createStreamTerminalOutcomeTracker();
    tracker.fail("socket reset");
    tracker.complete();
    expect(await tracker.outcome).toEqual({
      kind: "upstream_error",
      message: "socket reset",
    });
  });

  it("captures a passthrough source failure while preserving stream failure", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
        controller.error(new Error("upstream socket reset"));
      },
    });
    const tracked = __testHooks.trackUpstreamReadableStream(source);
    await expect(new Response(tracked.stream).text()).rejects.toBeInstanceOf(
      Error,
    );
    expect(await tracked.outcome).toEqual({
      kind: "upstream_error",
      message: "upstream socket reset",
    });
  });

  it("records client cancellation as a distinct terminal outcome", async () => {
    let sourceCancelled = false;
    const source = new ReadableStream<Uint8Array>({
      cancel() {
        sourceCancelled = true;
      },
    });
    const tracked = __testHooks.trackUpstreamReadableStream(source);

    await tracked.stream.cancel("client disconnected");

    expect(sourceCancelled).toBe(true);
    expect(await tracked.outcome).toEqual({ kind: "client_cancelled" });
  });

  it("promotes a terminal SSE error instead of reporting success", async () => {
    const { stream, telemetry } = createSSEInterceptor();
    const source = new Response(
      'event: error\ndata: {"type":"error","error":{"message":"quota stream interrupted"}}\n\n',
    ).body!;
    await new Response(source.pipeThrough(stream)).text();
    const data = await telemetry;

    expect(data.streamErrorMessage).toBe("quota stream interrupted");
    expect(
      mergeStreamTerminalOutcome(
        { kind: "completed" },
        data.streamErrorMessage,
      ),
    ).toEqual({
      kind: "upstream_error",
      message: "quota stream interrupted",
    });
    expect(
      __testHooks.getStreamFailureDetails({
        kind: "upstream_error",
        message: "quota stream interrupted",
      }),
    ).toEqual({
      status: 502,
      errorType: "stream_error",
      message: "quota stream interrupted",
    });
    expect(
      __testHooks.getStreamFailureDetails({ kind: "client_cancelled" }),
    ).toMatchObject({ status: 499, errorType: "client_cancelled" });
  });
});

describe("launchd lifecycle source invariants", () => {
  it("leaves restart ownership with launchd and keeps auto-update opt-in", async () => {
    const source = await readFile(
      new URL("../src/cli/commands/proxy.ts", import.meta.url),
      "utf8",
    );
    const updateState = await readFile(
      new URL("../src/lib/proxy/updateState.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("tryLaunchdRestart");
    expect(source).toContain("params.argv.dev || managedByLaunchd");
    expect(source).toContain("NEUROLINK_PROXY_AUTO_UPDATE");
    expect(source).toContain('["1", "on", "true"]');
    expect(source).toContain("stopUpdateChecks()");
    expect(source).toContain('from "../../../package.json" with');
    expect(source).toContain("<key>ExitTimeOut</key>");
    expect(source).toContain("backgroundRefreshInProgress");
    expect(source).toContain("await tokenStore.isDisabled(key)");
    expect(source).toContain(
      'await tokenStore.markDisabled(key, "refresh_invalid")',
    );
    expect(source).not.toContain("tokenChanged || legacyTransientDisable");
    expect(source).toContain("initAccountCooldown(devPaths.cooldownFile)");
    expect(source).not.toContain("Ignoring default config");
    expect(source).not.toContain("cooling: false");
    expect(source).toContain("catch(forceExitAfterShutdownFailure)");
    expect(source).toContain("Timed out draining the proxy server");
    expect(updateState).toContain("randomUUID()");
    expect(updateState).not.toContain("const tempPath = `${filePath}.tmp`");
  });

  it("keeps dev-mode cooldown state outside the live state directory", () => {
    const paths = resolveProxyPaths(true);
    expect(paths.cooldownFile).toBe(
      join(process.cwd(), ".neurolink-dev", "account-cooldowns.json"),
    );
  });

  it("does not fall back to known-cooling accounts", async () => {
    const source = await readFile(
      new URL("../src/lib/server/routes/claudeProxyRoutes.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("const effectiveAccounts = nonCoolingAccounts;");
    expect(source).toContain("eligible credentials reloaded");
    expect(source).toContain("authCooldownMessage");
    expect(source).not.toContain("credentials changed, re-enabling");
    expect(source).not.toContain(
      "nonCoolingAccounts.length > 0 ? nonCoolingAccounts : orderedAccounts",
    );
  });
});
