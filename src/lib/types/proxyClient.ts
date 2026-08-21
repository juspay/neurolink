import type { JsonObject } from "./common.js";

/**
 * One AI coding CLI the proxy can point at itself.
 *
 * Adding a CLI means adding one implementation of this type and one line in
 * `src/cli/proxy-clients/registry.ts`. Nothing else in the proxy should need
 * to know the client exists.
 */
export type CliProxyClientConfigurator = {
  /** Stable kebab-case identifier, e.g. "claude-code". */
  id: string;
  /** Human-readable name used in CLI output, e.g. "Claude Code". */
  displayName: string;
  /**
   * Whether this CLI appears to be installed. Configurators must not create
   * config files for a CLI the user never installed.
   */
  detect: () => Promise<boolean>;
  /**
   * Point the CLI at the proxy. `proxyBaseUrl` is the bare proxy origin
   * (e.g. "http://127.0.0.1:55669"); the configurator appends whatever path
   * suffix its CLI needs. Returns false when nothing was written, so callers
   * never print a success message for work that did not happen.
   */
  apply: (proxyBaseUrl: string) => Promise<boolean>;
  /**
   * Restore the user's previous configuration. `proxyBaseUrl` is the same bare
   * origin; a configurator that finds a different URL configured must leave it
   * alone and return false.
   */
  restore: (proxyBaseUrl: string) => Promise<boolean>;
};

/** Outcome of applying one configurator, for per-client CLI reporting. */
export type CliProxyClientApplyResult = {
  id: string;
  displayName: string;
  /** True only when the configurator actually wrote configuration. */
  applied: boolean;
  /** Present when the configurator threw; the caller decides how loud to be. */
  error?: Error;
};

/** Outcome of restoring one configurator. */
export type CliProxyClientRestoreResult = {
  id: string;
  displayName: string;
  /** True only when a previous configuration was actually restored. */
  restored: boolean;
  error?: Error;
};

/**
 * Raw contents of a Qwen Code `settings.json`. Deliberately open-ended: the
 * configurator rewrites only `security.auth` and must round-trip every other
 * key the user has set, including ones this repo does not know about.
 */
export type CliQwenSettings = Record<string, unknown>;

/**
 * Per-account token and cost totals derived from the proxy's own request log.
 *
 * `costUsd` is an **API-equivalent** figure: what the recorded tokens would
 * have cost at published per-token rates. Pooled OAuth accounts are billed by
 * subscription, so this is a value estimate, never an invoice. Consumers must
 * label it as such.
 */
export type CliAccountUsageTotals = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  /** Requests whose model carried no pricing row, so contributed no cost. */
  unpricedRequests: number;
  /** Distinct models with no pricing row, so an operator can chase them. */
  unpricedModels: string[];
};

/** One row of GET /accounts. */
export type CliAccountsRow = {
  /** Bare label, e.g. "someone@example.com". The join key across all sources. */
  label: string;
  /** Full pool key, e.g. "anthropic:someone@example.com". */
  key: string | null;
  /**
   * What this row actually is. Only "account" rows are real logins; the proxy
   * also tracks internal and translation pseudo-accounts, which have no quota
   * and should not be rendered as credentials.
   */
  kind: "account" | "internal" | "translation";
  type: string;
  status: string | null;
  cooling: boolean;
  allowed: boolean | null;
  expired: boolean | null;
  isPrimary: boolean;
  requests: number | null;
  errors: number | null;
  rateLimits: number | null;
  quotaRateLimits: number | null;
  /** Quota block from the limits snapshot, timestamps normalised to ms. */
  quota: JsonObject | null;
  /** Today's usage from the request log, or null when the log is unreadable. */
  usage: CliAccountUsageTotals | null;
};

/** Response body of GET /accounts. */
export type CliAccountsResponse = {
  generatedAt: number;
  /** UTC date whose request log the usage totals cover. */
  usageDate: string;
  /** True when quota came from the stored snapshot rather than a live fetch. */
  quotaFromSnapshot: boolean;
  /** Set when the usage totals could not be read at all. */
  usageError: string | null;
  /** Set when the quota snapshot could not be read; rows still carry status. */
  quotaError: string | null;
  costBasis: "api-equivalent";
  accounts: CliAccountsRow[];
};

/** One request as recorded in the proxy request log, reduced to what costing needs. */
export type ProxyLedgerEntry = {
  account: string;
  accountType: string;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

/** Incremental read position and accumulated entries for one request-log file. */
export type ProxyLedgerFileCursor = {
  /** Byte offset just past the last complete line consumed. */
  offset: number;
  size: number;
  /** requestId -> latest known entry, so a re-logged request cannot double count. */
  entries: Map<string, ProxyLedgerEntry>;
};
