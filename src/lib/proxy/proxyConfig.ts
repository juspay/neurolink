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
import { extname } from "node:path";
import { logger } from "../utils/logger.js";
import type {
  CloakingConfig,
  FallbackEntry,
  LoadProxyConfigOptions,
  ModelMapping,
  ProxyAccountConfig,
  ProxyConfigFile,
  ProxyRoutingConfig,
  YamlModule,
} from "../types/index.js";

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
 * - `fallback-chain` / `fallbackChain` — array of {provider, model}
 * - `passthroughModels` / `passthrough-models` — array of model IDs
 *
 * Accepts both camelCase and kebab-case keys for YAML-friendliness.
 */
function parseRoutingConfig(
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
  const rawFallback = (raw["fallback-chain"] ?? raw.fallbackChain) as
    | unknown[]
    | undefined;
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
        return { provider, model } satisfies FallbackEntry;
      })
      .filter((e): e is FallbackEntry => e !== null);
  }

  // Passthrough models (accept kebab-case or camelCase)
  const rawPassthrough = (raw["passthrough-models"] ??
    raw.passthroughModels) as unknown[] | undefined;
  if (Array.isArray(rawPassthrough)) {
    result.passthroughModels = rawPassthrough.map(String);
  }

  // Primary account (accept kebab-case or camelCase). Email or label of the
  // Anthropic account that should be tried first ("home"). Resolved to a
  // stable key (anthropic:<email>) at proxy boot; absence preserves the
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
