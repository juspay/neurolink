/**
 * YAML/JSON proxy configuration loader with environment variable resolution.
 *
 * Supports:
 * - Loading config from YAML or JSON files
 * - Environment variable interpolation: ${VAR_NAME} and ${VAR_NAME:-default}
 * - Multi-account proxy configurations
 * - Defaults for optional fields
 *
 * YAML parsing uses `js-yaml` when available (dynamic import), otherwise
 * falls back to JSON.parse.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import {
  MAX_MAX_INFLIGHT_PER_ACCOUNT,
  MIN_MAX_INFLIGHT_PER_ACCOUNT,
} from "./modelRouter.js";
import { logger } from "../utils/logger.js";
import type {
  CloakingConfig,
  CodexReasoningEffort,
  FallbackEntry,
  LoadProxyConfigOptions,
  ModelMapping,
  ProxyAccountConfig,
  ProxyConfigFile,
  ProxyRoutingConfig,
  YamlModule,
} from "../types/index.js";

/** Default on-disk path used when `proxy start` is not given `--config`. */
export function defaultProxyConfigPath(): string {
  return join(homedir(), ".neurolink", "proxy-config.yaml");
}

/** Resolve `--config` the same way `proxy start` / `proxy install` do. */
export function resolveProxyConfigPath(explicit?: string): string {
  const trimmed = explicit?.trim();
  return trimmed && trimmed.length > 0
    ? resolve(trimmed)
    : defaultProxyConfigPath();
}

// ---------------------------------------------------------------------------
// Environment variable resolution
// ---------------------------------------------------------------------------

/**
 * Regex matching `${VAR}` and `${VAR:-default}` patterns.
 * Non-greedy to handle multiple vars on a single line.
 */
const ENV_VAR_PATTERN = /\$\{([^}:]+?)(?::-(.*?))?\}/g;

/**
 * Replace all `${VAR}` / `${VAR:-default}` references in a string.
 *
 * Resolution order:
 * 1. Look up `VAR` in the provided env map (or process.env)
 * 2. If not found, use the `:-default` value when present
 * 3. If no default, leave the original `${VAR}` token so callers can detect
 *    unresolved variables.
 */
export function resolveEnvVars(
  value: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return value.replace(
    ENV_VAR_PATTERN,
    (_match, varName: string, defaultValue?: string) => {
      const envValue = env[varName];
      if (envValue !== undefined) {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      // Leave unresolved — callers can detect this
      return `\${${varName}}`;
    },
  );
}

/**
 * Recursively walk an object tree and resolve env vars in every string value.
 */
function resolveEnvVarsDeep(
  obj: unknown,
  env: Record<string, string | undefined>,
): unknown {
  if (typeof obj === "string") {
    return resolveEnvVars(obj, env);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveEnvVarsDeep(item, env));
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveEnvVarsDeep(val, env);
    }
    return result;
  }
  return obj;
}

/**
 * Walk the resolved config tree and warn about any remaining `${VAR}`
 * placeholders that were not resolved.  Returns the list of unresolved
 * variable names so callers can decide whether to abort.
 */
function warnUnresolvedPlaceholders(obj: unknown, path = ""): string[] {
  const unresolved: string[] = [];
  if (typeof obj === "string") {
    // Reset global regex state before matching
    ENV_VAR_PATTERN.lastIndex = 0;
    let match = ENV_VAR_PATTERN.exec(obj);
    while (match !== null) {
      const varName = match[1];
      unresolved.push(varName);
      logger.warn(
        `Unresolved placeholder \${${varName}} at "${path}" — ` +
          "check that the environment variable is set or provide a default with ${VAR:-default}",
      );
      match = ENV_VAR_PATTERN.exec(obj);
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      unresolved.push(...warnUnresolvedPlaceholders(obj[i], `${path}[${i}]`));
    }
  } else if (obj !== null && typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      unresolved.push(
        ...warnUnresolvedPlaceholders(val, path ? `${path}.${key}` : key),
      );
    }
  }
  return unresolved;
}

/**
 * Check for unresolved `${VAR}` placeholders in critical account fields
 * (apiKey, token, key) and throw if any are found. Non-critical unresolved
 * placeholders are allowed (they only produce warnings).
 */
function failOnUnresolvedAccountCredentials(obj: unknown): void {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return;
  }

  const raw = obj as Record<string, unknown>;
  const accounts = raw.accounts;
  if (!accounts || typeof accounts !== "object" || Array.isArray(accounts)) {
    return;
  }

  const criticalFields = ["apiKey", "token", "key"];
  const failures: string[] = [];

  for (const [provider, list] of Object.entries(
    accounts as Record<string, unknown>,
  )) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (let i = 0; i < list.length; i++) {
      const acct = list[i] as Record<string, unknown> | null;
      if (!acct || typeof acct !== "object") {
        continue;
      }
      for (const field of criticalFields) {
        const val = acct[field];
        if (typeof val === "string") {
          ENV_VAR_PATTERN.lastIndex = 0;
          if (ENV_VAR_PATTERN.test(val)) {
            ENV_VAR_PATTERN.lastIndex = 0;
            failures.push(`accounts.${provider}[${i}].${field}`);
          }
          ENV_VAR_PATTERN.lastIndex = 0;
        }
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Unresolved environment variable placeholders in critical account fields:\n  - ${failures.join("\n  - ")}\n` +
        "Set the required environment variables or provide defaults with ${VAR:-default}.",
    );
  }
}

// ---------------------------------------------------------------------------
// YAML parsing (dynamic import with fallback)
// ---------------------------------------------------------------------------

/** Shape of the dynamically-imported `js-yaml` module. */

/**
 * Parse YAML content into a JS object.
 * Uses `js-yaml` if available (dynamic import), otherwise falls back to
 * JSON.parse.
 */
async function parseYaml(content: string): Promise<unknown> {
  let yaml: YamlModule | undefined;
  try {
    yaml = (await import(/* @vite-ignore */ "js-yaml" as string)) as YamlModule;
  } catch {
    // js-yaml not installed — try JSON fallback
    logger.debug(
      "[ProxyConfig] js-yaml not available, falling back to JSON parser",
    );
    try {
      return JSON.parse(content);
    } catch {
      throw new Error(
        "Failed to parse proxy config: js-yaml is not installed and the file is not valid JSON",
      );
    }
  }

  // js-yaml is available — parse YAML (let syntax errors propagate)
  try {
    return yaml.default?.load?.(content) ?? yaml.load(content);
  } catch (err) {
    throw new Error(
      `Failed to parse proxy config as YAML: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

// ---------------------------------------------------------------------------
// Defaults & validation
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHT = 1;
const DEFAULT_ENABLED = true;

/**
 * Apply default values to an account config.
 */
function applyAccountDefaults(
  account: Partial<ProxyAccountConfig>,
): ProxyAccountConfig {
  return {
    name: account.name ?? "unnamed",
    apiKey: account.apiKey ?? "",
    baseUrl: account.baseUrl,
    orgId: account.orgId,
    weight: account.weight ?? DEFAULT_WEIGHT,
    enabled: account.enabled ?? DEFAULT_ENABLED,
    rateLimit: account.rateLimit,
    metadata: account.metadata,
  };
}

const CODEX_REASONING_EFFORTS: readonly CodexReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

function isCodexReasoningEffort(value: unknown): value is CodexReasoningEffort {
  return CODEX_REASONING_EFFORTS.some((effort) => effort === value);
}

const MIN_SESSION_AFFINITY_IDLE_TTL_MS = 60_000;
const MAX_SESSION_AFFINITY_IDLE_TTL_MS = 86_400_000;
const MIN_SPILL_INFLIGHT = 0;
const MAX_SPILL_INFLIGHT = 100;

function kebabToCamelRoutingKey(kebabKey: string): string {
  return kebabKey.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

/**
 * Read one of the eight routing keys that predate #1787's five newer keys,
 * accepting either spelling and treating a `null` value under either
 * spelling as "unset" so it falls back to the caller's default instead of
 * failing validation.
 *
 * `??` already treats a `null` kebab value the same as an absent one and
 * falls through to the camel spelling — that precedence must not change (a
 * `null` kebab key must not mask a non-null camel value) — so the only gap
 * is a combined value that still resolves to `null` (camel-only `null`, or
 * both spellings `null`): that case is mapped to `undefined` here so every
 * existing `!== undefined` guard and default keeps working unchanged.
 *
 * `wasNull` is true exactly when the resolved value became `undefined`
 * *because* one of the spellings was explicitly `null` — never merely
 * because both were absent — so callers can warn once per null key without
 * warning on ordinary omission.
 */
function readLegacyRoutingKey(
  routing: Record<string, unknown>,
  kebabKey: string,
): { value: unknown; wasNull: boolean } {
  const camelKey = kebabToCamelRoutingKey(kebabKey);
  const rawKebab = routing[kebabKey];
  const rawCamel = routing[camelKey];
  const combined = rawKebab ?? rawCamel;
  const value = combined === null ? undefined : combined;
  const wasNull =
    value === undefined && (rawKebab === null || rawCamel === null);
  return { value, wasNull };
}

/**
 * Reads a routing policy key under its kebab-case or camelCase spelling,
 * choosing by presence rather than with `??`: `??` treats an explicit
 * kebab-case `null` as absent and falls through to an unset camelCase key,
 * so the same null would be silently defaulted under one spelling and
 * rejected under the other. Unlike `readLegacyRoutingKey`, a `null` is
 * returned as-is so validation rejects it: these five keys never accepted it.
 */
function readRoutingPolicyKey(
  routing: Record<string, unknown>,
  kebabKey: string,
): unknown {
  const camelKey = kebabToCamelRoutingKey(kebabKey);
  return routing[kebabKey] !== undefined
    ? routing[kebabKey]
    : routing[camelKey];
}

/**
 * Validate the shape of a parsed proxy config.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateProxyConfig(config: unknown): string[] {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    errors.push("Config must be a non-null object");
    return errors;
  }

  const cfg = config as Record<string, unknown>;

  if (cfg.version !== undefined && typeof cfg.version !== "number") {
    errors.push(`"version" must be a number, got ${typeof cfg.version}`);
  }

  const hasAccounts =
    !!cfg.accounts &&
    typeof cfg.accounts === "object" &&
    !Array.isArray(cfg.accounts);
  const hasRouting =
    !!cfg.routing &&
    typeof cfg.routing === "object" &&
    !Array.isArray(cfg.routing);

  if (cfg.routing !== undefined && !hasRouting) {
    errors.push('"routing" must be an object');
    return errors;
  }

  if (hasRouting) {
    const routing = cfg.routing as Record<string, unknown>;
    const rawFallback = readLegacyRoutingKey(routing, "fallback-chain").value;
    if (Array.isArray(rawFallback)) {
      rawFallback.forEach((entry: unknown, index: number) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return;
        }
        const fallback = entry as Record<string, unknown>;
        const effort =
          fallback["reasoning-effort"] !== undefined
            ? fallback["reasoning-effort"]
            : fallback.reasoningEffort;
        if (effort === undefined) {
          return;
        }
        const field = `routing.fallback-chain[${index}].reasoning-effort`;
        if (!isCodexReasoningEffort(effort)) {
          errors.push(
            `${field} must be one of: ${CODEX_REASONING_EFFORTS.join(", ")}`,
          );
        }
        if (String(fallback.provider ?? "").trim() !== "codex") {
          errors.push(`${field} is only supported for provider codex`);
        }
      });
    }
    const rawAccountAllowlist = readLegacyRoutingKey(
      routing,
      "account-allowlist",
    ).value;
    if (rawAccountAllowlist !== undefined) {
      if (!Array.isArray(rawAccountAllowlist)) {
        errors.push(
          "routing.account-allowlist must be an array of non-empty strings",
        );
      } else {
        rawAccountAllowlist.forEach((entry, index) => {
          if (typeof entry !== "string" || entry.trim() === "") {
            errors.push(
              `routing.account-allowlist[${index}] must be a non-empty string`,
            );
          }
        });
      }
    }

    const rawQuotaRouting = readLegacyRoutingKey(
      routing,
      "quota-routing",
    ).value;
    const normalizedQuotaRouting =
      typeof rawQuotaRouting === "string"
        ? rawQuotaRouting.trim().toLowerCase()
        : undefined;
    if (
      rawQuotaRouting !== undefined &&
      typeof rawQuotaRouting !== "boolean" &&
      normalizedQuotaRouting !== "true" &&
      normalizedQuotaRouting !== "false"
    ) {
      errors.push("routing.quota-routing must be a boolean");
    }

    // Without this a typo (`use-overage: nevr`) loads cleanly and silently
    // falls back to "auto" — the operator asked to block paid extra usage and
    // gets provider-driven overage instead.
    const rawUseOverage = readLegacyRoutingKey(routing, "use-overage").value;
    if (
      rawUseOverage !== undefined &&
      !["auto", "always", "never"].includes(
        typeof rawUseOverage === "string"
          ? rawUseOverage.trim().toLowerCase()
          : "",
      )
    ) {
      errors.push("routing.use-overage must be auto, always, or never");
    }

    const rawAutoFallback = readLegacyRoutingKey(
      routing,
      "auto-fallback",
    ).value;
    const normalizedAutoFallback =
      typeof rawAutoFallback === "string"
        ? rawAutoFallback.trim().toLowerCase()
        : undefined;
    if (
      rawAutoFallback !== undefined &&
      typeof rawAutoFallback !== "boolean" &&
      normalizedAutoFallback !== "true" &&
      normalizedAutoFallback !== "false"
    ) {
      errors.push("routing.auto-fallback must be a boolean");
    }

    const rawMaxInflight = readLegacyRoutingKey(
      routing,
      "max-inflight-per-account",
    ).value;
    if (
      rawMaxInflight !== undefined &&
      (typeof rawMaxInflight !== "number" ||
        !Number.isInteger(rawMaxInflight) ||
        rawMaxInflight < MIN_MAX_INFLIGHT_PER_ACCOUNT ||
        rawMaxInflight > MAX_MAX_INFLIGHT_PER_ACCOUNT)
    ) {
      errors.push(
        "routing.max-inflight-per-account must be an integer between 1 and 20",
      );
    }

    const rawSessionSoftLimit = readLegacyRoutingKey(
      routing,
      "session-soft-limit",
    ).value;
    if (rawSessionSoftLimit !== undefined) {
      const sessionSoftLimit = Number(rawSessionSoftLimit);
      if (
        !Number.isFinite(sessionSoftLimit) ||
        sessionSoftLimit <= 0 ||
        sessionSoftLimit > 1
      ) {
        errors.push("routing.session-soft-limit must be a number in (0, 1]");
      }
    }

    const rawSessionResetToleranceMs = readLegacyRoutingKey(
      routing,
      "session-reset-tolerance-ms",
    ).value;
    if (rawSessionResetToleranceMs !== undefined) {
      const sessionResetToleranceMs = Number(rawSessionResetToleranceMs);
      if (
        !Number.isInteger(sessionResetToleranceMs) ||
        sessionResetToleranceMs <= 0
      ) {
        errors.push(
          "routing.session-reset-tolerance-ms must be a positive integer",
        );
      }
    }

    const rawAccountRanking = readRoutingPolicyKey(routing, "account-ranking");
    if (
      rawAccountRanking !== undefined &&
      rawAccountRanking !== "expiry-first" &&
      rawAccountRanking !== "headroom-first"
    ) {
      errors.push(
        "routing.account-ranking must be expiry-first or headroom-first",
      );
    }

    const rawPreferPrimary = readRoutingPolicyKey(routing, "prefer-primary");
    const normalizedPreferPrimary =
      typeof rawPreferPrimary === "string"
        ? rawPreferPrimary.trim().toLowerCase()
        : undefined;
    if (
      rawPreferPrimary !== undefined &&
      typeof rawPreferPrimary !== "boolean" &&
      normalizedPreferPrimary !== "true" &&
      normalizedPreferPrimary !== "false"
    ) {
      errors.push("routing.prefer-primary must be a boolean");
    }

    const rawSessionAffinity = readRoutingPolicyKey(
      routing,
      "session-affinity",
    );
    const normalizedSessionAffinity =
      typeof rawSessionAffinity === "string"
        ? rawSessionAffinity.trim().toLowerCase()
        : undefined;
    if (
      rawSessionAffinity !== undefined &&
      typeof rawSessionAffinity !== "boolean" &&
      normalizedSessionAffinity !== "true" &&
      normalizedSessionAffinity !== "false"
    ) {
      errors.push("routing.session-affinity must be a boolean");
    }

    const rawAffinityTtl = readRoutingPolicyKey(
      routing,
      "session-affinity-idle-ttl-ms",
    );
    if (
      rawAffinityTtl !== undefined &&
      (typeof rawAffinityTtl !== "number" ||
        !Number.isInteger(rawAffinityTtl) ||
        rawAffinityTtl < MIN_SESSION_AFFINITY_IDLE_TTL_MS ||
        rawAffinityTtl > MAX_SESSION_AFFINITY_IDLE_TTL_MS)
    ) {
      errors.push(
        "routing.session-affinity-idle-ttl-ms must be an integer between 60000 and 86400000",
      );
    }

    const rawSpillInflight = readRoutingPolicyKey(routing, "spill-inflight");
    if (
      rawSpillInflight !== undefined &&
      (typeof rawSpillInflight !== "number" ||
        !Number.isInteger(rawSpillInflight) ||
        rawSpillInflight < MIN_SPILL_INFLIGHT ||
        rawSpillInflight > MAX_SPILL_INFLIGHT)
    ) {
      errors.push(
        "routing.spill-inflight must be an integer between 0 and 100",
      );
    }
  }

  if (!hasAccounts && !hasRouting) {
    errors.push('Config must contain at least one of "accounts" or "routing"');
    return errors;
  }

  if (cfg.accounts !== undefined && !hasAccounts) {
    errors.push(
      '"accounts" must be an object mapping provider names to account arrays',
    );
    return errors;
  }

  if (hasAccounts) {
    const accounts = cfg.accounts as Record<string, unknown>;
    let totalAccounts = 0;
    for (const [provider, list] of Object.entries(accounts)) {
      if (!Array.isArray(list)) {
        errors.push(
          `accounts.${provider} must be an array, got ${typeof list}`,
        );
        continue;
      }
      totalAccounts += list.length;
      for (let i = 0; i < list.length; i++) {
        const acct = list[i] as Record<string, unknown>;
        if (!acct || typeof acct !== "object") {
          errors.push(`accounts.${provider}[${i}] must be an object`);
          continue;
        }
        if (typeof acct.apiKey !== "string" || acct.apiKey.length === 0) {
          errors.push(
            `accounts.${provider}[${i}].apiKey is required and must be a non-empty string`,
          );
        }
      }
    }

    if (totalAccounts === 0 && !hasRouting) {
      errors.push('"accounts" must contain at least one account');
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Plaintext key detection
// ---------------------------------------------------------------------------

/**
 * Detect API keys stored as plaintext (not using `${ENV_VAR}` references)
 * and log a warning for each account.
 */
function warnPlaintextApiKeys(
  accounts: Record<string, ProxyAccountConfig[]>,
): void {
  for (const [provider, list] of Object.entries(accounts)) {
    for (const acct of list) {
      if (
        acct.apiKey &&
        acct.apiKey.length > 0 &&
        !ENV_VAR_PATTERN.test(acct.apiKey)
      ) {
        // Reset the regex lastIndex (it has the global flag)
        ENV_VAR_PATTERN.lastIndex = 0;
        logger.warn(
          `\u26A0 API key stored in plaintext in config file for ${provider}/${acct.name}. ` +
            "Consider using ${ENV_VAR} references.",
        );
      }
      // Also reset after a non-match test
      ENV_VAR_PATTERN.lastIndex = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Routing config parser
// ---------------------------------------------------------------------------

/**
 * Parse the optional `routing` section from a raw proxy config object.
 *
 * Extracts:
 * - `strategy` ("round-robin" | "fill-first")
 * - `model-mappings` / `modelMappings` — array of {from, to, provider}
 * - `fallback-chain` / `fallbackChain` — array of {provider, model, reasoningEffort?}
 * - `auto-fallback` / `autoFallback` — opt in to an unspecified provider
 * - `max-inflight-per-account` / `maxInflightPerAccount` — concurrency cap
 * - `passthroughModels` / `passthrough-models` — array of model IDs
 * - `quota-routing` / `quotaRouting` — quota-aware fill-first ordering
 * - `session-soft-limit` / `sessionSoftLimit` — proactive handoff threshold
 * - `session-reset-tolerance-ms` / `sessionResetToleranceMs` — reset bucket
 * - `account-allowlist` / `accountAllowlist` — allowed Anthropic account IDs
 * - `account-ranking` / `accountRanking` — expiry-first | headroom-first
 * - `prefer-primary` / `preferPrimary` — bias ranking toward primaryAccount
 * - `session-affinity` / `sessionAffinity` — sticky-session binding
 * - `session-affinity-idle-ttl-ms` / `sessionAffinityIdleTtlMs` — idle unbind
 * - `spill-inflight` / `spillInflight` — overflow threshold for sticky sessions
 *
 * Accepts both camelCase and kebab-case keys for YAML-friendliness.
 */
export function parseRoutingConfig(
  raw: Record<string, unknown> | undefined,
): Partial<ProxyRoutingConfig> | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const result: Partial<ProxyRoutingConfig> = {};

  // Strategy
  const strategy = raw.strategy as string | undefined;
  if (strategy === "round-robin" || strategy === "fill-first") {
    result.strategy = strategy;
  }

  // Model mappings (accept kebab-case or camelCase)
  const rawMappings = (raw["model-mappings"] ?? raw.modelMappings) as
    | unknown[]
    | undefined;
  if (Array.isArray(rawMappings)) {
    result.modelMappings = rawMappings
      .filter(
        (m): m is Record<string, unknown> =>
          m !== null && typeof m === "object",
      )
      .map((m) => {
        const from = String(m.from ?? "").trim();
        const to = String(m.to ?? "").trim();
        const provider =
          String(m.provider ?? "anthropic").trim() || "anthropic";
        if (!from || !to) {
          logger.warn(
            `[proxy-config] Skipping model mapping with empty "from" or "to": ${JSON.stringify(m)}`,
          );
          return null;
        }
        return {
          from,
          to,
          provider,
        } satisfies ModelMapping;
      })
      .filter((m): m is ModelMapping => m !== null);
  }

  // Fallback chain (accept kebab-case or camelCase)
  const fallbackChainRead = readLegacyRoutingKey(raw, "fallback-chain");
  if (fallbackChainRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.fallback-chain is null; using the default",
    );
  }
  const rawFallback = fallbackChainRead.value as unknown[] | undefined;
  if (Array.isArray(rawFallback)) {
    result.fallbackChain = rawFallback
      .filter(
        (e): e is Record<string, unknown> =>
          e !== null && typeof e === "object",
      )
      .map((e) => {
        const provider = String(e.provider ?? "").trim();
        const model = String(e.model ?? "").trim();
        if (!provider || !model) {
          logger.warn(
            `[proxy-config] Skipping fallback entry with empty "provider" or "model": ${JSON.stringify(e)}`,
          );
          return null;
        }
        const effort =
          e["reasoning-effort"] !== undefined
            ? e["reasoning-effort"]
            : e.reasoningEffort;
        return {
          provider,
          model,
          ...(isCodexReasoningEffort(effort)
            ? { reasoningEffort: effort }
            : {}),
        } satisfies FallbackEntry;
      })
      .filter((e): e is FallbackEntry => e !== null);
  }

  // Passthrough models (accept kebab-case or camelCase)
  const rawPassthrough = (raw["passthrough-models"] ??
    raw.passthroughModels) as unknown[] | undefined;
  if (Array.isArray(rawPassthrough)) {
    result.passthroughModels = rawPassthrough.map(String);
  }

  const quotaRoutingRead = readLegacyRoutingKey(raw, "quota-routing");
  if (quotaRoutingRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.quota-routing is null; using the default",
    );
  }
  const rawQuotaRouting = quotaRoutingRead.value;
  if (rawQuotaRouting !== undefined) {
    if (typeof rawQuotaRouting === "boolean") {
      result.quotaRouting = rawQuotaRouting;
    } else if (
      typeof rawQuotaRouting === "string" &&
      ["true", "false"].includes(rawQuotaRouting.trim().toLowerCase())
    ) {
      result.quotaRouting = rawQuotaRouting.trim().toLowerCase() === "true";
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.quotaRouting: expected boolean, got ${typeof rawQuotaRouting}`,
      );
    }
  }

  const useOverageRead = readLegacyRoutingKey(raw, "use-overage");
  if (useOverageRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.use-overage is null; using the default",
    );
  }
  const rawUseOverage = useOverageRead.value;
  if (rawUseOverage !== undefined) {
    const normalized =
      typeof rawUseOverage === "string"
        ? rawUseOverage.trim().toLowerCase()
        : "";
    if (
      normalized === "auto" ||
      normalized === "always" ||
      normalized === "never"
    ) {
      result.useOverage = normalized;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.useOverage: expected auto|always|never, got ${String(rawUseOverage)}`,
      );
    }
  }

  const autoFallbackRead = readLegacyRoutingKey(raw, "auto-fallback");
  if (autoFallbackRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.auto-fallback is null; using the default",
    );
  }
  const rawAutoFallback = autoFallbackRead.value;
  if (rawAutoFallback !== undefined) {
    if (typeof rawAutoFallback === "boolean") {
      result.autoFallback = rawAutoFallback;
    } else if (
      typeof rawAutoFallback === "string" &&
      ["true", "false"].includes(rawAutoFallback.trim().toLowerCase())
    ) {
      result.autoFallback = rawAutoFallback.trim().toLowerCase() === "true";
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.autoFallback: expected boolean, got ${typeof rawAutoFallback}`,
      );
    }
  }

  const maxInflightRead = readLegacyRoutingKey(raw, "max-inflight-per-account");
  if (maxInflightRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.max-inflight-per-account is null; using the default",
    );
  }
  const rawMaxInflight = maxInflightRead.value;
  if (rawMaxInflight !== undefined) {
    if (
      typeof rawMaxInflight === "number" &&
      Number.isInteger(rawMaxInflight) &&
      rawMaxInflight >= MIN_MAX_INFLIGHT_PER_ACCOUNT &&
      rawMaxInflight <= MAX_MAX_INFLIGHT_PER_ACCOUNT
    ) {
      result.maxInflightPerAccount = rawMaxInflight;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.maxInflightPerAccount: expected integer between 1 and 20, got ${String(rawMaxInflight)}`,
      );
    }
  }

  const sessionSoftLimitRead = readLegacyRoutingKey(raw, "session-soft-limit");
  if (sessionSoftLimitRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.session-soft-limit is null; using the default",
    );
  }
  const rawSessionSoftLimit = sessionSoftLimitRead.value;
  if (rawSessionSoftLimit !== undefined) {
    const sessionSoftLimit = Number(rawSessionSoftLimit);
    if (
      Number.isFinite(sessionSoftLimit) &&
      sessionSoftLimit > 0 &&
      sessionSoftLimit <= 1
    ) {
      result.sessionSoftLimit = sessionSoftLimit;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.sessionSoftLimit: expected number in (0, 1], got ${String(rawSessionSoftLimit)}`,
      );
    }
  }

  const sessionResetToleranceMsRead = readLegacyRoutingKey(
    raw,
    "session-reset-tolerance-ms",
  );
  if (sessionResetToleranceMsRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.session-reset-tolerance-ms is null; using the default",
    );
  }
  const rawSessionResetToleranceMs = sessionResetToleranceMsRead.value;
  if (rawSessionResetToleranceMs !== undefined) {
    const sessionResetToleranceMs = Number(rawSessionResetToleranceMs);
    if (
      Number.isInteger(sessionResetToleranceMs) &&
      sessionResetToleranceMs > 0
    ) {
      result.sessionResetToleranceMs = sessionResetToleranceMs;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.sessionResetToleranceMs: expected positive integer, got ${String(rawSessionResetToleranceMs)}`,
      );
    }
  }

  // Primary account (accept kebab-case or camelCase). Email or label of the
  // Anthropic account used as "home": under quota routing it is the
  // ranking's final tiebreaker unless prefer-primary is set, and it is
  // tried first only when quota routing is disabled. Resolved to a stable
  // key (anthropic:<email>) at proxy boot; absence preserves the
  // pre-existing insertion-order behavior.
  const rawPrimary = (raw["primary-account"] ?? raw.primaryAccount) as unknown;
  if (rawPrimary !== undefined) {
    if (typeof rawPrimary === "string" && rawPrimary.trim() !== "") {
      result.primaryAccount = rawPrimary.trim();
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.primaryAccount: expected non-empty ` +
          `string, got ${typeof rawPrimary}`,
      );
    }
  }

  const accountAllowlistRead = readLegacyRoutingKey(raw, "account-allowlist");
  if (accountAllowlistRead.wasNull) {
    logger.warn(
      "[proxy-config] routing.account-allowlist is null; using the default",
    );
  }
  const rawAccountAllowlist = accountAllowlistRead.value;
  if (Array.isArray(rawAccountAllowlist)) {
    result.accountAllowlist = [
      ...new Set(rawAccountAllowlist.map((entry) => String(entry).trim())),
    ];
  }

  const rawAccountRanking = readRoutingPolicyKey(raw, "account-ranking");
  if (rawAccountRanking !== undefined) {
    if (
      rawAccountRanking === "expiry-first" ||
      rawAccountRanking === "headroom-first"
    ) {
      result.accountRanking = rawAccountRanking;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.accountRanking: expected expiry-first|headroom-first, got ${String(rawAccountRanking)}`,
      );
    }
  }

  const rawPreferPrimary = readRoutingPolicyKey(raw, "prefer-primary");
  if (rawPreferPrimary !== undefined) {
    if (typeof rawPreferPrimary === "boolean") {
      result.preferPrimary = rawPreferPrimary;
    } else if (
      typeof rawPreferPrimary === "string" &&
      ["true", "false"].includes(rawPreferPrimary.trim().toLowerCase())
    ) {
      result.preferPrimary = rawPreferPrimary.trim().toLowerCase() === "true";
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.preferPrimary: expected boolean, got ${typeof rawPreferPrimary}`,
      );
    }
  }

  const rawSessionAffinity = readRoutingPolicyKey(raw, "session-affinity");
  if (rawSessionAffinity !== undefined) {
    if (typeof rawSessionAffinity === "boolean") {
      result.sessionAffinity = rawSessionAffinity;
    } else if (
      typeof rawSessionAffinity === "string" &&
      ["true", "false"].includes(rawSessionAffinity.trim().toLowerCase())
    ) {
      result.sessionAffinity =
        rawSessionAffinity.trim().toLowerCase() === "true";
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.sessionAffinity: expected boolean, got ${typeof rawSessionAffinity}`,
      );
    }
  }

  const rawAffinityTtl = readRoutingPolicyKey(
    raw,
    "session-affinity-idle-ttl-ms",
  );
  if (rawAffinityTtl !== undefined) {
    if (
      typeof rawAffinityTtl === "number" &&
      Number.isInteger(rawAffinityTtl) &&
      rawAffinityTtl >= MIN_SESSION_AFFINITY_IDLE_TTL_MS &&
      rawAffinityTtl <= MAX_SESSION_AFFINITY_IDLE_TTL_MS
    ) {
      result.sessionAffinityIdleTtlMs = rawAffinityTtl;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.sessionAffinityIdleTtlMs: expected integer between 60000 and 86400000, got ${String(rawAffinityTtl)}`,
      );
    }
  }

  const rawSpillInflight = readRoutingPolicyKey(raw, "spill-inflight");
  if (rawSpillInflight !== undefined) {
    if (
      typeof rawSpillInflight === "number" &&
      Number.isInteger(rawSpillInflight) &&
      rawSpillInflight >= MIN_SPILL_INFLIGHT &&
      rawSpillInflight <= MAX_SPILL_INFLIGHT
    ) {
      result.spillInflight = rawSpillInflight;
    } else {
      logger.warn(
        `[proxy-config] Ignoring routing.spillInflight: expected integer between 0 and 100, got ${String(rawSpillInflight)}`,
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cloaking config validation
// ---------------------------------------------------------------------------

const VALID_CLOAKING_MODES = new Set(["auto", "always", "never"]);

/**
 * Validate and return a CloakingConfig, or `undefined` if the section is absent.
 * Throws on structurally invalid input so problems surface at config-load time
 * rather than at first proxy request.
 */
function validateCloakingConfig(raw: unknown): CloakingConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `Invalid proxy config: "cloaking" must be an object, got ${typeof raw}`,
    );
  }
  const obj = raw as Record<string, unknown>;

  if (!VALID_CLOAKING_MODES.has(obj.mode as string)) {
    throw new Error(
      `Invalid proxy config: "cloaking.mode" must be one of "auto", "always", "never", got "${String(obj.mode)}"`,
    );
  }

  if (
    obj.plugins !== undefined &&
    (typeof obj.plugins !== "object" ||
      obj.plugins === null ||
      Array.isArray(obj.plugins))
  ) {
    throw new Error(
      `Invalid proxy config: "cloaking.plugins" must be an object, got ${typeof obj.plugins}`,
    );
  }

  return raw as CloakingConfig;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load and parse a proxy configuration file (YAML or JSON).
 *
 * @param filePath - Absolute or relative path to the config file.
 * @param options  - Optional settings for env resolution.
 * @returns Parsed and validated ProxyConfigFile.
 * @throws When the file cannot be read, parsed, or fails validation.
 */
export async function loadProxyConfig(
  filePath: string,
  options: LoadProxyConfigOptions = {},
): Promise<ProxyConfigFile> {
  const { resolveEnv: shouldResolve = true, env = process.env } = options;

  logger.debug("[ProxyConfig] Loading proxy config", { filePath });

  // 1. Read file
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read proxy config file: ${filePath} — ${(err as Error).message}`,
      { cause: err },
    );
  }

  // 2. Parse (YAML for .yml/.yaml, JSON for .json, try YAML-then-JSON for others)
  const ext = extname(filePath).toLowerCase();
  let parsed: unknown;

  if (ext === ".json") {
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(
        `Failed to parse JSON proxy config: ${(err as Error).message}`,
        { cause: err },
      );
    }
  } else {
    // .yml, .yaml, or unknown — try YAML (which also handles JSON)
    parsed = await parseYaml(content);
  }

  // 3. Warn about plaintext API keys BEFORE env-var resolution so that
  //    correctly parameterized `${ENV_VAR}` configs are not false-positived.
  //    Guard each entry: only process arrays (non-arrays are caught by
  //    validateProxyConfig below, so we must not crash here first).
  {
    const preResolvedRaw = parsed as Record<string, unknown>;
    const preResolvedAccounts = preResolvedRaw.accounts as
      | Record<string, unknown>
      | undefined;
    if (
      preResolvedAccounts &&
      typeof preResolvedAccounts === "object" &&
      !Array.isArray(preResolvedAccounts)
    ) {
      const preAccounts: Record<string, ProxyAccountConfig[]> = {};
      for (const [provider, list] of Object.entries(preResolvedAccounts)) {
        if (!Array.isArray(list)) {
          continue;
        }
        preAccounts[provider] = list.map((item) =>
          applyAccountDefaults(item as Partial<ProxyAccountConfig>),
        );
      }
      warnPlaintextApiKeys(preAccounts);
    }
  }

  // 4. Resolve env vars
  if (shouldResolve) {
    parsed = resolveEnvVarsDeep(
      parsed,
      env as Record<string, string | undefined>,
    );

    // 4b. Warn about any placeholders that could not be resolved
    warnUnresolvedPlaceholders(parsed);

    // 4c. Fail hard if critical credential fields still have unresolved vars
    failOnUnresolvedAccountCredentials(parsed);
  }

  // 5. Validate
  const errors = validateProxyConfig(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid proxy config:\n  - ${errors.join("\n  - ")}`);
  }

  // 6. Apply defaults
  const raw = parsed as Record<string, unknown>;
  const accounts: Record<string, ProxyAccountConfig[]> = {};

  const rawAccounts = raw.accounts as Record<string, unknown[]> | undefined;
  if (
    rawAccounts &&
    typeof rawAccounts === "object" &&
    !Array.isArray(rawAccounts)
  ) {
    for (const [provider, list] of Object.entries(rawAccounts)) {
      accounts[provider] = list.map((item) =>
        applyAccountDefaults(item as Partial<ProxyAccountConfig>),
      );
    }
  }

  // 7. Extract routing config
  const routing = parseRoutingConfig(
    raw.routing as Record<string, unknown> | undefined,
  );

  // 8. Extract and validate cloaking config
  const cloaking = validateCloakingConfig(raw.cloaking);

  const result: ProxyConfigFile = {
    version: (raw.version as number) ?? 1,
    defaultProvider: raw.defaultProvider as string | undefined,
    defaultBaseUrl: raw.defaultBaseUrl as string | undefined,
    accounts,
    routing,
    cloaking,
  };

  logger.debug("[ProxyConfig] Proxy config loaded successfully", {
    providers: Object.keys(accounts),
    totalAccounts: Object.values(accounts).reduce(
      (sum, a) => sum + a.length,
      0,
    ),
    hasRouting: !!routing,
    hasCloaking: !!cloaking,
  });

  return result;
}

/**
 * Load proxy config from a raw string (YAML or JSON) instead of a file path.
 * Useful for testing or when config is stored in environment variables.
 */
export async function parseProxyConfigString(
  content: string,
  options: LoadProxyConfigOptions = {},
): Promise<ProxyConfigFile> {
  const { resolveEnv: shouldResolve = true, env = process.env } = options;

  let parsed: unknown = await parseYaml(content);

  // Warn about plaintext API keys BEFORE env-var resolution (same as loadProxyConfig).
  {
    const preResolvedRaw = parsed as Record<string, unknown>;
    const preResolvedAccounts = preResolvedRaw.accounts as
      | Record<string, unknown>
      | undefined;
    if (
      preResolvedAccounts &&
      typeof preResolvedAccounts === "object" &&
      !Array.isArray(preResolvedAccounts)
    ) {
      const preAccounts: Record<string, ProxyAccountConfig[]> = {};
      for (const [provider, list] of Object.entries(preResolvedAccounts)) {
        if (!Array.isArray(list)) {
          continue;
        }
        preAccounts[provider] = list.map((item) =>
          applyAccountDefaults(item as Partial<ProxyAccountConfig>),
        );
      }
      warnPlaintextApiKeys(preAccounts);
    }
  }

  if (shouldResolve) {
    parsed = resolveEnvVarsDeep(
      parsed,
      env as Record<string, string | undefined>,
    );

    // Warn about any placeholders that could not be resolved
    warnUnresolvedPlaceholders(parsed);

    // Fail hard if critical credential fields still have unresolved vars
    failOnUnresolvedAccountCredentials(parsed);
  }

  const errors = validateProxyConfig(parsed);
  if (errors.length > 0) {
    throw new Error(`Invalid proxy config:\n  - ${errors.join("\n  - ")}`);
  }

  const raw = parsed as Record<string, unknown>;
  const accounts: Record<string, ProxyAccountConfig[]> = {};

  const rawAccounts = raw.accounts as Record<string, unknown[]> | undefined;
  if (
    rawAccounts &&
    typeof rawAccounts === "object" &&
    !Array.isArray(rawAccounts)
  ) {
    for (const [provider, list] of Object.entries(rawAccounts)) {
      accounts[provider] = list.map((item) =>
        applyAccountDefaults(item as Partial<ProxyAccountConfig>),
      );
    }
  }

  const routing = parseRoutingConfig(
    raw.routing as Record<string, unknown> | undefined,
  );
  const cloaking = validateCloakingConfig(raw.cloaking);

  return {
    version: (raw.version as number) ?? 1,
    defaultProvider: raw.defaultProvider as string | undefined,
    defaultBaseUrl: raw.defaultBaseUrl as string | undefined,
    accounts,
    routing,
    cloaking,
  };
}
