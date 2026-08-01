import { createHash } from "node:crypto";
import { watchFile, unwatchFile } from "node:fs";
import type { Stats } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  createAccountAllowlist,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  normalizeAnthropicAccountKey,
} from "./accountSelection.js";
import { ModelRouter } from "./modelRouter.js";
import { loadProxyConfig } from "./proxyConfig.js";
import type {
  AccountAllowlist,
  LoadedProxyConfig,
  ProxyRuntimeConfigListener,
  ProxyRuntimeConfigReloadListener,
  ProxyRuntimeConfigReloadResult,
  ProxyRuntimeConfigReloadSource,
  ProxyRuntimeConfigSnapshot,
  ProxyRuntimeConfigStatus,
  ProxyRuntimeConfigStoreOptions,
  ProxyStartStrategy,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const DEFAULT_WATCH_INTERVAL_MS = 1_000;
const DEFAULT_WATCH_DEBOUNCE_MS = 100;
const DEFAULT_SESSION_SOFT_LIMIT = 0.97;
const DEFAULT_SESSION_RESET_TOLERANCE_MS = 15 * 60 * 1_000;

function errorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function isMissingFileError(error: unknown): boolean {
  return errorCode(error) === "ENOENT";
}

function normalizeStrategy(
  configured: string | undefined,
  override: ProxyStartStrategy | undefined,
): ProxyStartStrategy {
  if (override) {
    return override;
  }
  return configured === "round-robin" ? "round-robin" : "fill-first";
}

function resolveQuotaRoutingEnabled(
  envValue: string | undefined,
  configured: boolean | undefined,
): boolean {
  if (envValue === undefined) {
    return configured ?? true;
  }
  const normalized = envValue.trim().toLowerCase();
  return normalized !== "off" && normalized !== "false" && normalized !== "0";
}

function resolveSessionSoftLimit(
  envValue: string | undefined,
  configured: number | undefined,
  rejectInvalid: boolean,
): number {
  if (envValue !== undefined) {
    const parsed = Number(envValue);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) {
      return parsed;
    }
    const message =
      `Invalid NEUROLINK_PROXY_SESSION_SOFT_LIMIT=${envValue}; ` +
      "expected number in (0, 1]";
    if (rejectInvalid) {
      throw new Error(message);
    }
    logger.warn(`[proxy-config] ${message}; using configured/default value`);
  }
  return configured ?? DEFAULT_SESSION_SOFT_LIMIT;
}

function resolveSessionResetToleranceMs(
  envValue: string | undefined,
  configured: number | undefined,
  rejectInvalid: boolean,
): number {
  if (envValue !== undefined) {
    const parsed = Number(envValue);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    const message =
      `Invalid NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS=${envValue}; ` +
      "expected positive integer";
    if (rejectInvalid) {
      throw new Error(message);
    }
    logger.warn(`[proxy-config] ${message}; using configured/default value`);
  }
  return configured ?? DEFAULT_SESSION_RESET_TOLERANCE_MS;
}

async function resolvePrimaryAccountKey(
  primaryEmail: string | undefined,
): Promise<string | undefined> {
  const trimmed = primaryEmail?.trim();
  if (!trimmed) {
    return undefined;
  }
  const key = normalizeAnthropicAccountKey(trimmed);
  try {
    const { tokenStore } = await import("../auth/tokenStore.js");
    const known = await tokenStore.listByPrefix("anthropic:");
    if (
      !known.some((knownKey) => normalizeAnthropicAccountKey(knownKey) === key)
    ) {
      logger.warn(
        `[proxy] WARN: configured routing.primaryAccount=${trimmed} not found in token store; it will activate after authentication`,
      );
    }
  } catch (error) {
    logger.debug(
      `[proxy] could not validate primary account against token store: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return key;
}

async function resolveAccountAllowlist(
  configuredAccounts: string[] | undefined,
): Promise<AccountAllowlist | undefined> {
  const allowlist = createAccountAllowlist(configuredAccounts);
  if (allowlist === undefined) {
    return undefined;
  }
  if (allowlist.size === 0) {
    logger.warn(
      "[proxy] routing.accountAllowlist is empty; all stored Anthropic credentials are denied",
    );
    return allowlist;
  }

  try {
    const { tokenStore } = await import("../auth/tokenStore.js");
    const known = new Set(
      (await tokenStore.listByPrefix("anthropic:")).map(
        normalizeAnthropicAccountKey,
      ),
    );
    known.add(LEGACY_ANTHROPIC_ACCOUNT_KEY);
    known.add(ENV_ANTHROPIC_ACCOUNT_KEY);
    for (const key of allowlist) {
      if (!known.has(key)) {
        logger.warn(
          `[proxy] WARN: routing.accountAllowlist entry ${key} is allowed but not currently authenticated`,
        );
      }
    }
  } catch (error) {
    logger.debug(
      `[proxy] could not validate account allowlist against token store: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return allowlist;
}

function cloneLoadedConfig(
  loaded: LoadedProxyConfig | null,
): LoadedProxyConfig | null {
  if (!loaded) {
    return null;
  }
  const routing = loaded.routing;
  if (!routing) {
    return Object.freeze({});
  }
  return Object.freeze({
    routing: Object.freeze({
      ...routing,
      ...(routing.modelMappings
        ? {
            modelMappings: Object.freeze(
              routing.modelMappings.map((entry) => Object.freeze({ ...entry })),
            ),
          }
        : {}),
      ...(routing.fallbackChain
        ? {
            fallbackChain: Object.freeze(
              routing.fallbackChain.map((entry) => Object.freeze({ ...entry })),
            ),
          }
        : {}),
      ...(routing.passthroughModels
        ? { passthroughModels: Object.freeze([...routing.passthroughModels]) }
        : {}),
      ...(routing.accountAllowlist
        ? { accountAllowlist: Object.freeze([...routing.accountAllowlist]) }
        : {}),
    }),
  }) as LoadedProxyConfig;
}

function assertResolvedRoutingValues(value: unknown, path = "routing"): void {
  if (typeof value === "string") {
    if (value.includes("${")) {
      throw new Error(`Unresolved environment placeholder at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertResolvedRoutingValues(entry, `${path}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertResolvedRoutingValues(entry, `${path}.${key}`);
    }
  }
}

async function buildCandidate(
  options: ProxyRuntimeConfigStoreOptions,
  generation: number,
  allowMissingConfig: boolean,
  allowMissingEnvFile: boolean,
  rejectInvalidHotEnv: boolean,
): Promise<{
  snapshot: ProxyRuntimeConfigSnapshot;
  configFilePresent: boolean;
  envFilePresent: boolean;
  envFileHash: string;
}> {
  const effectiveEnv = { ...options.baseEnv };
  let envFilePresent = false;
  let envFileValues: Record<string, string> = {};
  if (options.envFilePath) {
    try {
      const envFileContent = await readFile(options.envFilePath, "utf8");
      const { parse } = await import("dotenv");
      envFileValues = parse(envFileContent);
      Object.assign(effectiveEnv, envFileValues);
      envFilePresent = true;
    } catch (error) {
      if (
        !isMissingFileError(error) ||
        options.envFileRequired ||
        !allowMissingEnvFile
      ) {
        throw new Error(
          `Failed to load proxy env file ${options.envFilePath}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  }

  let loadedConfig: LoadedProxyConfig | null = null;
  let configFilePresent = false;
  try {
    loadedConfig = (await loadProxyConfig(options.configPath, {
      env: effectiveEnv,
    })) as LoadedProxyConfig;
    configFilePresent = true;
  } catch (error) {
    if (
      !isMissingFileError(error) ||
      options.configRequired ||
      !allowMissingConfig
    ) {
      throw error;
    }
  }

  const proxyConfig = cloneLoadedConfig(loadedConfig);
  const routing = proxyConfig?.routing;
  assertResolvedRoutingValues(routing);
  const strategy = normalizeStrategy(
    routing?.strategy,
    options.strategyOverride,
  );
  const primaryAccountKey = await resolvePrimaryAccountKey(
    routing?.primaryAccount,
  );
  const accountAllowlist = await resolveAccountAllowlist(
    routing?.accountAllowlist,
  );
  if (
    primaryAccountKey &&
    !isAccountAllowed(primaryAccountKey, accountAllowlist)
  ) {
    throw new Error(
      `Configured routing.primaryAccount=${routing?.primaryAccount} is excluded by routing.accountAllowlist`,
    );
  }

  const quotaRoutingEnabled = resolveQuotaRoutingEnabled(
    effectiveEnv.NEUROLINK_PROXY_QUOTA_ROUTING,
    routing?.quotaRouting,
  );
  const sessionSoftLimit = resolveSessionSoftLimit(
    effectiveEnv.NEUROLINK_PROXY_SESSION_SOFT_LIMIT,
    routing?.sessionSoftLimit,
    rejectInvalidHotEnv,
  );
  const sessionResetToleranceMs = resolveSessionResetToleranceMs(
    effectiveEnv.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS,
    routing?.sessionResetToleranceMs,
    rejectInvalidHotEnv,
  );
  const modelRouter = routing
    ? new ModelRouter({
        strategy,
        modelMappings: routing.modelMappings ?? [],
        fallbackChain: routing.fallbackChain ?? [],
        autoFallback: routing.autoFallback,
        maxInflightPerAccount: routing.maxInflightPerAccount,
        passthroughModels: routing.passthroughModels,
        quotaRouting: routing.quotaRouting,
        sessionSoftLimit: routing.sessionSoftLimit,
        sessionResetToleranceMs: routing.sessionResetToleranceMs,
        primaryAccount: routing.primaryAccount,
        accountAllowlist: routing.accountAllowlist,
      })
    : undefined;
  const envFileHash = createHash("sha256")
    .update(
      envFilePresent
        ? JSON.stringify(
            Object.entries(envFileValues).sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            ),
          )
        : "[missing]",
    )
    .digest("hex")
    .slice(0, 16);
  const fingerprintSource = JSON.stringify({
    strategy,
    passthrough: options.passthrough,
    routing: routing ?? null,
    primaryAccountKey,
    accountAllowlist: accountAllowlist ? [...accountAllowlist].sort() : null,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
  });
  const configHash = createHash("sha256")
    .update(fingerprintSource)
    .digest("hex")
    .slice(0, 16);

  return {
    snapshot: Object.freeze({
      generation,
      loadedAt: new Date().toISOString(),
      configHash,
      proxyConfig,
      strategy,
      modelRouter,
      passthrough: options.passthrough,
      primaryAccountKey,
      accountAllowlist,
      quotaRoutingEnabled,
      sessionSoftLimit,
      sessionResetToleranceMs,
    }),
    configFilePresent,
    envFilePresent,
    envFileHash,
  };
}

/** Atomic last-known-good runtime configuration with file-triggered reloads. */
export class ProxyRuntimeConfigStore {
  private readonly options: ProxyRuntimeConfigStoreOptions;
  private currentSnapshot: ProxyRuntimeConfigSnapshot;
  private status: ProxyRuntimeConfigStatus;
  private readonly listeners = new Set<ProxyRuntimeConfigListener>();
  private readonly reloadListeners =
    new Set<ProxyRuntimeConfigReloadListener>();
  private reloadQueue: Promise<void> = Promise.resolve();
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private configFileObserved: boolean;
  private envFileObserved: boolean;
  private currentEnvFileHash: string;
  private readonly watchListener = (current: Stats, previous: Stats): void => {
    if (
      current.mtimeMs === previous.mtimeMs &&
      current.size === previous.size &&
      current.nlink === previous.nlink
    ) {
      return;
    }
    this.scheduleWatchReload();
  };

  private constructor(
    options: ProxyRuntimeConfigStoreOptions,
    snapshot: ProxyRuntimeConfigSnapshot,
    configFileObserved: boolean,
    envFileObserved: boolean,
    envFileHash: string,
  ) {
    this.options = { ...options, baseEnv: { ...options.baseEnv } };
    this.currentSnapshot = snapshot;
    this.configFileObserved = configFileObserved;
    this.envFileObserved = envFileObserved;
    this.currentEnvFileHash = envFileHash;
    this.status = {
      configPath: options.configPath,
      ...(options.envFilePath ? { envFilePath: options.envFilePath } : {}),
      generation: snapshot.generation,
      loadedAt: snapshot.loadedAt,
      configHash: snapshot.configHash,
      watching: false,
      consecutiveFailures: 0,
    };
  }

  static async create(
    options: ProxyRuntimeConfigStoreOptions,
  ): Promise<ProxyRuntimeConfigStore> {
    const candidate = await buildCandidate(options, 1, true, true, false);
    return new ProxyRuntimeConfigStore(
      options,
      candidate.snapshot,
      candidate.configFilePresent,
      candidate.envFilePresent,
      candidate.envFileHash,
    );
  }

  getSnapshot(): ProxyRuntimeConfigSnapshot {
    return this.currentSnapshot;
  }

  getStatus(): ProxyRuntimeConfigStatus {
    return { ...this.status };
  }

  subscribe(listener: ProxyRuntimeConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeReload(listener: ProxyRuntimeConfigReloadListener): () => void {
    this.reloadListeners.add(listener);
    return () => this.reloadListeners.delete(listener);
  }

  reload(
    source: ProxyRuntimeConfigReloadSource = "manual",
  ): Promise<ProxyRuntimeConfigReloadResult> {
    const run = this.reloadQueue.then(
      () => this.performReload(source),
      () => this.performReload(source),
    );
    this.reloadQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  startWatching(): void {
    if (this.status.watching) {
      return;
    }
    const interval = Math.max(
      50,
      this.options.watchIntervalMs ?? DEFAULT_WATCH_INTERVAL_MS,
    );
    watchFile(
      this.options.configPath,
      { interval, persistent: false },
      this.watchListener,
    );
    if (this.options.envFilePath) {
      watchFile(
        this.options.envFilePath,
        { interval, persistent: false },
        this.watchListener,
      );
    }
    this.status = { ...this.status, watching: true };
  }

  stopWatching(): void {
    if (!this.status.watching) {
      return;
    }
    unwatchFile(this.options.configPath, this.watchListener);
    if (this.options.envFilePath) {
      unwatchFile(this.options.envFilePath, this.watchListener);
    }
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = undefined;
    }
    this.status = { ...this.status, watching: false };
  }

  private scheduleWatchReload(): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = setTimeout(
      () => {
        this.reloadTimer = undefined;
        void this.reload("watch");
      },
      Math.max(0, this.options.watchDebounceMs ?? DEFAULT_WATCH_DEBOUNCE_MS),
    );
    this.reloadTimer.unref?.();
  }

  private async performReload(
    source: ProxyRuntimeConfigReloadSource,
  ): Promise<ProxyRuntimeConfigReloadResult> {
    const attemptedAt = new Date().toISOString();
    this.status = {
      ...this.status,
      lastReloadAttemptAt: attemptedAt,
      lastReloadSource: source,
    };
    try {
      const candidate = await buildCandidate(
        this.options,
        this.currentSnapshot.generation + 1,
        !this.configFileObserved,
        !this.envFileObserved,
        true,
      );
      this.configFileObserved ||= candidate.configFilePresent;
      this.envFileObserved ||= candidate.envFilePresent;
      if (
        candidate.snapshot.configHash === this.currentSnapshot.configHash &&
        candidate.envFileHash === this.currentEnvFileHash
      ) {
        this.status = {
          ...this.status,
          lastReloadAt: attemptedAt,
          lastReloadError: undefined,
          consecutiveFailures: 0,
        };
        const result = {
          applied: true,
          changed: false,
          generation: this.currentSnapshot.generation,
        };
        this.notifyReloadListeners(result);
        return result;
      }

      const environmentChanged =
        candidate.envFileHash !== this.currentEnvFileHash;
      this.currentSnapshot = candidate.snapshot;
      this.currentEnvFileHash = candidate.envFileHash;
      this.status = {
        ...this.status,
        generation: candidate.snapshot.generation,
        loadedAt: candidate.snapshot.loadedAt,
        configHash: candidate.snapshot.configHash,
        lastReloadAt: attemptedAt,
        lastReloadError: undefined,
        consecutiveFailures: 0,
      };
      logger.always(
        `[proxy] configuration generation ${candidate.snapshot.generation} applied via ${source}`,
      );
      for (const listener of this.listeners) {
        try {
          listener(candidate.snapshot);
        } catch (error) {
          logger.warn(
            `[proxy] runtime config listener failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      const result = {
        applied: true,
        changed: true,
        generation: candidate.snapshot.generation,
        ...(environmentChanged ? { environmentChanged: true } : {}),
      };
      this.notifyReloadListeners(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = {
        ...this.status,
        lastReloadError: message,
        consecutiveFailures: this.status.consecutiveFailures + 1,
      };
      logger.warn(
        `[proxy] configuration reload rejected; keeping generation ${this.currentSnapshot.generation}: ${message}`,
      );
      const result = {
        applied: false,
        changed: false,
        generation: this.currentSnapshot.generation,
        error: message,
      };
      this.notifyReloadListeners(result);
      return result;
    }
  }

  private notifyReloadListeners(result: ProxyRuntimeConfigReloadResult): void {
    for (const listener of this.reloadListeners) {
      try {
        listener(result, this.getStatus());
      } catch (error) {
        logger.warn(
          `[proxy] runtime config reload listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
