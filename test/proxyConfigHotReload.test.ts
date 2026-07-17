import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProxyRuntimeConfigStore } from "../src/lib/proxy/runtimeConfig.js";
import { parseProxyConfigString } from "../src/lib/proxy/proxyConfig.js";
import { createClaudeProxyRoutes } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { createOpenAIProxyRoutes } from "../src/lib/server/routes/openaiProxyRoutes.js";
import { resetStats } from "../src/lib/proxy/usageStats.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";

const tempDirs: string[] = [];
const stores: ProxyRuntimeConfigStore[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-config-reload-"));
  tempDirs.push(dir);
  return dir;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number = 3_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function routingConfig(
  strategy: "fill-first" | "round-robin",
  targetModel: string,
  fallbackModel: string,
) {
  return {
    routing: {
      strategy,
      modelMappings: [
        { from: "hot-model", to: targetModel, provider: "vertex" },
      ],
      fallbackChain: [{ provider: "openai", model: fallbackModel }],
      passthroughModels: ["claude-passthrough"],
    },
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const store of stores.splice(0)) {
    store.stopWatching();
  }
  resetStats();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("proxy runtime configuration", () => {
  it("parses kebab-case quota routing controls", async () => {
    const parsed = await parseProxyConfigString(
      `
routing:
  strategy: fill-first
  model-mappings: []
  fallback-chain: []
  quota-routing: \${QUOTA_ROUTING}
  session-soft-limit: 0.91
  session-reset-tolerance-ms: 45000
`,
      {
        env: { QUOTA_ROUTING: "false" },
      },
    );

    expect(parsed.routing).toMatchObject({
      quotaRouting: false,
      sessionSoftLimit: 0.91,
      sessionResetToleranceMs: 45_000,
    });
  });

  it("atomically publishes a new immutable routing generation", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        routing: {
          ...routingConfig("fill-first", "old-primary", "old-fallback").routing,
          quotaRouting: false,
          sessionSoftLimit: 0.82,
          sessionResetToleranceMs: 1_500,
          primaryAccount: "Primary@Example.com",
          accountAllowlist: ["Primary@Example.com", "Secondary@Example.com"],
        },
      }),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);

    const first = store.getSnapshot();
    expect(first).toMatchObject({
      generation: 1,
      strategy: "fill-first",
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.82,
      sessionResetToleranceMs: 1_500,
      primaryAccountKey: "anthropic:primary@example.com",
    });
    expect(first.accountAllowlist).toEqual(
      new Set([
        "anthropic:primary@example.com",
        "anthropic:secondary@example.com",
      ]),
    );
    expect(first.modelRouter?.resolve("hot-model")).toEqual({
      provider: "vertex",
      model: "old-primary",
    });

    await writeFile(
      configPath,
      JSON.stringify(
        routingConfig("round-robin", "new-primary", "new-fallback"),
      ),
    );
    await expect(store.reload("manual")).resolves.toEqual({
      applied: true,
      changed: true,
      generation: 2,
    });

    const second = store.getSnapshot();
    expect(second).not.toBe(first);
    expect(second).toMatchObject({ generation: 2, strategy: "round-robin" });
    expect(second.modelRouter?.resolve("hot-model")).toEqual({
      provider: "vertex",
      model: "new-primary",
    });
    expect(second.accountAllowlist).toBeUndefined();
    expect(first.modelRouter?.resolve("hot-model")).toEqual({
      provider: "vertex",
      model: "old-primary",
    });
  });

  it("retains last-known-good config after invalid edits and deletion", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    const originalConfig = routingConfig(
      "fill-first",
      "stable-primary",
      "stable-fallback",
    );
    await writeFile(configPath, JSON.stringify(originalConfig));
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);
    const stable = store.getSnapshot();

    await writeFile(configPath, "{ malformed json");
    const malformed = await store.reload("watch");
    expect(malformed).toMatchObject({
      applied: false,
      changed: false,
      generation: 1,
    });
    expect(store.getSnapshot()).toBe(stable);
    expect(store.getStatus()).toMatchObject({
      generation: 1,
      consecutiveFailures: 1,
      lastReloadSource: "watch",
    });
    expect(store.getStatus().lastReloadError).toContain(
      "Failed to parse JSON proxy config",
    );

    await writeFile(
      configPath,
      JSON.stringify({
        routing: {
          ...routingConfig("round-robin", "bad", "bad").routing,
          sessionSoftLimit: 2,
        },
      }),
    );
    const invalid = await store.reload("manual");
    expect(invalid.applied).toBe(false);
    expect(invalid.error).toContain(
      "routing.session-soft-limit must be a number in (0, 1]",
    );
    expect(store.getSnapshot()).toBe(stable);
    expect(store.getStatus().consecutiveFailures).toBe(2);

    await writeFile(configPath, JSON.stringify(originalConfig));
    await expect(store.reload("manual")).resolves.toEqual({
      applied: true,
      changed: false,
      generation: 1,
    });
    expect(store.getStatus()).toMatchObject({
      consecutiveFailures: 0,
      lastReloadError: undefined,
    });

    await unlink(configPath);
    const deleted = await store.reload("manual");
    expect(deleted.applied).toBe(false);
    expect(deleted.error).toContain("Failed to read proxy config file");
    expect(store.getSnapshot()).toBe(stable);
  });

  it("reloads routing env overrides and interpolation without mutating process.env", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    const envFilePath = join(dir, ".env");
    await writeFile(
      configPath,
      JSON.stringify({
        routing: {
          strategy: "fill-first",
          modelMappings: [
            {
              from: "hot-model",
              to: "${TARGET_MODEL}",
              provider: "vertex",
            },
          ],
          fallbackChain: [],
          quotaRouting: true,
          sessionSoftLimit: 0.9,
          sessionResetToleranceMs: 2_000,
        },
      }),
    );
    await writeFile(
      envFilePath,
      [
        "TARGET_MODEL=from-env-v1",
        "NEUROLINK_PROXY_QUOTA_ROUTING=off",
        "NEUROLINK_PROXY_SESSION_SOFT_LIMIT=0.75",
        "NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS=9000",
      ].join("\n"),
    );
    const originalTargetModel = process.env.TARGET_MODEL;
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      envFilePath,
      envFileRequired: true,
      baseEnv: {},
      strategyOverride: "round-robin",
      passthrough: false,
    });
    stores.push(store);

    expect(store.getSnapshot()).toMatchObject({
      strategy: "round-robin",
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.75,
      sessionResetToleranceMs: 9_000,
    });
    expect(store.getSnapshot().modelRouter?.resolve("hot-model").model).toBe(
      "from-env-v1",
    );
    expect(process.env.TARGET_MODEL).toBe(originalTargetModel);

    await writeFile(
      envFilePath,
      [
        "TARGET_MODEL=from-env-v2",
        "NEUROLINK_PROXY_QUOTA_ROUTING=on",
        "NEUROLINK_PROXY_SESSION_SOFT_LIMIT=0.88",
        "NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS=12000",
      ].join("\n"),
    );
    await store.reload("manual");
    expect(store.getSnapshot()).toMatchObject({
      generation: 2,
      strategy: "round-robin",
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.88,
      sessionResetToleranceMs: 12_000,
    });
    expect(store.getSnapshot().modelRouter?.resolve("hot-model").model).toBe(
      "from-env-v2",
    );

    const stable = store.getSnapshot();
    await writeFile(
      envFilePath,
      [
        "NEUROLINK_PROXY_QUOTA_ROUTING=on",
        "NEUROLINK_PROXY_SESSION_SOFT_LIMIT=0.88",
        "NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS=12000",
      ].join("\n"),
    );
    const unresolved = await store.reload("manual");
    expect(unresolved.applied).toBe(false);
    expect(unresolved.error).toContain(
      "Unresolved environment placeholder at routing.modelMappings[0].to",
    );
    expect(store.getSnapshot()).toBe(stable);

    await writeFile(
      envFilePath,
      [
        "TARGET_MODEL=ignored-invalid-env",
        "NEUROLINK_PROXY_QUOTA_ROUTING=on",
        "NEUROLINK_PROXY_SESSION_SOFT_LIMIT=0.88oops",
        "NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS=12000",
      ].join("\n"),
    );
    const invalidEnv = await store.reload("manual");
    expect(invalidEnv.applied).toBe(false);
    expect(invalidEnv.error).toContain(
      "Invalid NEUROLINK_PROXY_SESSION_SOFT_LIMIT=0.88oops",
    );
    expect(store.getSnapshot()).toBe(stable);

    await unlink(envFilePath);
    expect((await store.reload("manual")).applied).toBe(false);
    expect(store.getSnapshot()).toBe(stable);
  });

  it("serializes concurrent reload attempts and notifies rejected reloads", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify(routingConfig("fill-first", "v1", "fallback-v1")),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);
    const reloadEvents = vi.fn();
    store.subscribeReload(reloadEvents);

    await writeFile(
      configPath,
      JSON.stringify(routingConfig("round-robin", "v2", "fallback-v2")),
    );
    const [first, second] = await Promise.all([
      store.reload("manual"),
      store.reload("sighup"),
    ]);
    expect(first).toEqual({ applied: true, changed: true, generation: 2 });
    expect(second).toEqual({ applied: true, changed: false, generation: 2 });
    expect(store.getSnapshot().generation).toBe(2);

    await writeFile(configPath, "not-json");
    expect((await store.reload("watch")).applied).toBe(false);
    expect(reloadEvents).toHaveBeenCalledTimes(3);
    expect(reloadEvents.mock.calls[2][1]).toMatchObject({
      generation: 2,
      consecutiveFailures: 1,
      lastReloadSource: "watch",
    });
  });

  it("watches config changes and stops cleanly", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify(routingConfig("fill-first", "v1", "fallback-v1")),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
      watchIntervalMs: 50,
      watchDebounceMs: 10,
    });
    stores.push(store);
    store.startWatching();
    expect(store.getStatus().watching).toBe(true);

    await writeFile(
      configPath,
      JSON.stringify(routingConfig("round-robin", "v2", "fallback-v2")),
    );
    await waitFor(() => store.getSnapshot().generation === 2);
    expect(store.getSnapshot().strategy).toBe("round-robin");

    store.stopWatching();
    expect(store.getStatus().watching).toBe(false);
    await writeFile(
      configPath,
      JSON.stringify(routingConfig("fill-first", "v3", "fallback-v3")),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(store.getSnapshot().generation).toBe(2);
  });

  it("detects config and env files created after startup", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    const envFilePath = join(dir, ".env");
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: false,
      envFilePath,
      envFileRequired: false,
      baseEnv: {},
      passthrough: false,
      watchIntervalMs: 50,
      watchDebounceMs: 10,
    });
    stores.push(store);
    expect(store.getSnapshot()).toMatchObject({
      generation: 1,
      strategy: "fill-first",
      modelRouter: undefined,
    });
    store.startWatching();

    await writeFile(envFilePath, "TARGET_MODEL=created-after-startup\n");
    await writeFile(
      configPath,
      JSON.stringify({
        routing: {
          strategy: "round-robin",
          modelMappings: [
            {
              from: "hot-model",
              to: "${TARGET_MODEL}",
              provider: "vertex",
            },
          ],
          fallbackChain: [],
        },
      }),
    );

    await waitFor(() => store.getSnapshot().generation === 2);
    expect(store.getSnapshot().strategy).toBe("round-robin");
    expect(store.getSnapshot().modelRouter?.resolve("hot-model").model).toBe(
      "created-after-startup",
    );
  });
});

describe("request routing snapshots", () => {
  it("reports the active generation through the in-process proxy app", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify(routingConfig("fill-first", "v1", "fallback-v1")),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);
    store.startWatching();
    const initial = store.getSnapshot();
    const { app } = await createProxyStartApp({
      neurolink: { getToolRegistry: () => ({}) } as never,
      modelRouter: initial.modelRouter,
      strategy: initial.strategy,
      passthrough: initial.passthrough,
      port: 55124,
      host: "127.0.0.1",
      proxyConfig: initial.proxyConfig,
      primaryAccountKey: initial.primaryAccountKey,
      accountAllowlist: initial.accountAllowlist,
      runtimeConfigStore: store,
    });

    const firstHealth = await (await app.request("/health")).json();
    expect(firstHealth).toMatchObject({ strategy: "fill-first" });

    await writeFile(
      configPath,
      JSON.stringify(routingConfig("round-robin", "v2", "fallback-v2")),
    );
    await store.reload("manual");
    const secondHealth = await (await app.request("/health")).json();
    expect(secondHealth).toMatchObject({ strategy: "round-robin" });

    const status = await (await app.request("/status")).json();
    expect(status).toMatchObject({
      strategy: "round-robin",
      config: {
        generation: 2,
        watching: true,
        lastReloadSource: "manual",
        lastReloadError: null,
        consecutiveFailures: 0,
      },
    });

    await writeFile(configPath, "{broken");
    await store.reload("watch");
    const rejectedStatus = await (await app.request("/status")).json();
    expect(rejectedStatus).toMatchObject({
      strategy: "round-robin",
      config: {
        generation: 2,
        lastReloadSource: "watch",
        consecutiveFailures: 1,
      },
    });
    expect(rejectedStatus.config.lastReloadError).toContain(
      "Failed to parse JSON proxy config",
    );
  });

  it("updates model discovery on the next request", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify(routingConfig("fill-first", "v1", "fallback-v1")),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);
    const routeGroup = createClaudeProxyRoutes(
      store.getSnapshot().modelRouter,
      "",
      "fill-first",
      false,
      undefined,
      {
        runtimeConfigProvider: () => store.getSnapshot(),
      },
    );
    const openAIRouteGroup = createOpenAIProxyRoutes(
      store.getSnapshot().modelRouter,
      "",
      55124,
      () => store.getSnapshot(),
    );
    const modelsRoute = routeGroup.routes.find(
      (route) => route.method === "GET" && route.path === "/v1/models",
    );
    expect(modelsRoute).toBeDefined();
    const openAIModelsRoute = openAIRouteGroup.routes.find(
      (route) => route.method === "GET" && route.path === "/v1/models",
    );
    expect(openAIModelsRoute).toBeDefined();
    const first = (await modelsRoute!.handler({} as never)) as {
      data: Array<{ id: string }>;
    };
    expect(first.data.map((model) => model.id)).toContain("hot-model");
    const firstOpenAI = (await openAIModelsRoute!.handler({} as never)) as {
      data: Array<{ id: string }>;
    };
    expect(firstOpenAI.data.map((model) => model.id)).toContain("hot-model");

    await writeFile(
      configPath,
      JSON.stringify({
        routing: {
          strategy: "fill-first",
          modelMappings: [
            { from: "new-hot-model", to: "v2", provider: "vertex" },
          ],
          fallbackChain: [],
        },
      }),
    );
    await store.reload("manual");
    const second = (await modelsRoute!.handler({} as never)) as {
      data: Array<{ id: string }>;
    };
    expect(second.data.map((model) => model.id)).toContain("new-hot-model");
    expect(second.data.map((model) => model.id)).not.toContain("hot-model");
    const secondOpenAI = (await openAIModelsRoute!.handler({} as never)) as {
      data: Array<{ id: string }>;
    };
    expect(secondOpenAI.data.map((model) => model.id)).toContain(
      "new-hot-model",
    );
    expect(secondOpenAI.data.map((model) => model.id)).not.toContain(
      "hot-model",
    );
  });

  it("keeps one generation for an in-flight fallback chain", async () => {
    const dir = await createTempDir();
    const configPath = join(dir, "proxy-config.json");
    await writeFile(
      configPath,
      JSON.stringify(
        routingConfig("fill-first", "old-primary", "old-fallback"),
      ),
    );
    const store = await ProxyRuntimeConfigStore.create({
      configPath,
      configRequired: true,
      baseEnv: {},
      passthrough: false,
    });
    stores.push(store);
    const routeGroup = createClaudeProxyRoutes(
      store.getSnapshot().modelRouter,
      "",
      "fill-first",
      false,
      undefined,
      {
        runtimeConfigProvider: () => store.getSnapshot(),
      },
    );
    const messagesRoute = routeGroup.routes.find(
      (route) => route.method === "POST" && route.path === "/v1/messages",
    );
    expect(messagesRoute).toBeDefined();

    let releaseFirstAttempt: (() => void) | undefined;
    let signalFirstAttempt: (() => void) | undefined;
    const firstAttemptStarted = new Promise<void>((resolve) => {
      signalFirstAttempt = resolve;
    });
    const firstAttemptGate = new Promise<void>((resolve) => {
      releaseFirstAttempt = resolve;
    });
    const attemptedRoutes: Array<{ provider?: string; model?: string }> = [];
    const stream = vi.fn(async (options: Record<string, unknown>) => {
      attemptedRoutes.push({
        provider:
          typeof options.provider === "string" ? options.provider : undefined,
        model: typeof options.model === "string" ? options.model : undefined,
      });
      if (attemptedRoutes.length === 1) {
        signalFirstAttempt?.();
        await firstAttemptGate;
        throw new Error("force old fallback");
      }
      return {
        stream: (async function* () {
          yield { content: "fallback succeeded" };
        })(),
        model: options.model,
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1 },
        toolCalls: [],
      };
    });
    const request = messagesRoute!.handler({
      requestId: "hot-reload-in-flight",
      method: "POST",
      path: "/v1/messages",
      headers: {},
      query: {},
      params: {},
      body: {
        model: "hot-model",
        max_tokens: 128,
        messages: [{ role: "user", content: "hello" }],
      },
      neurolink: { stream },
      toolRegistry: {},
      timestamp: Date.now(),
      metadata: {},
    } as never);

    await firstAttemptStarted;
    await writeFile(
      configPath,
      JSON.stringify(
        routingConfig("round-robin", "new-primary", "new-fallback"),
      ),
    );
    await store.reload("manual");
    releaseFirstAttempt?.();
    await expect(request).resolves.toMatchObject({ type: "message" });
    expect(attemptedRoutes).toEqual([
      { provider: "vertex", model: "old-primary" },
      { provider: "openai", model: "old-fallback" },
    ]);
    expect(store.getSnapshot().modelRouter?.resolve("hot-model").model).toBe(
      "new-primary",
    );
  });
});
