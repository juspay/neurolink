/**
 * Types for `src/lib/localUsage/` — reading token usage out of each AI CLI's
 * own local session logs.
 *
 * Why this exists alongside the proxy's ledger: the proxy can only account for
 * traffic that went through it, which caps coverage at the CLIs that expose a
 * base-URL override. Every CLI writes its own local transcript regardless, so
 * reading those recovers the rest — and recovers history from before the proxy
 * was ever installed. It is also an independent source of truth: a pricing
 * defect in the proxy's own accounting cannot hide from a reader that derives
 * cost from a different input.
 */

/**
 * Stable identifier for one CLI this subsystem can read local usage from.
 * Kebab-case, matching `CliProxyClientConfigurator.id`'s convention — a
 * different registry, but the same repo-wide convention for CLI identifiers.
 */
export type LocalUsageCliId =
  | "claude-code"
  | "codex"
  | "gemini-cli"
  | "opencode"
  | "qwen-code"
  | "copilot-cli"
  | "cursor"
  | "amp"
  | "hermes"
  | "kiro"
  | "antigravity"
  | "grok";

/**
 * How much to trust a computed cost figure.
 *
 * Not decoration: some CLIs are flat-rate subscriptions where a per-request
 * cost is meaningless, and at least one publishes a byte heuristic rather than
 * a real number. A caller must never render "heuristic" with the same
 * confidence as "modeled", so the distinction travels with the number.
 */
export type LocalUsageCostConfidence = "modeled" | "unavailable" | "heuristic";

/**
 * How a reader avoids counting the same turn twice.
 *
 * Metadata on the descriptor, for introspection and for the person writing the
 * next reader — the aggregator does not branch on it.
 */
export type LocalUsageDedupStrategy =
  | "message-id-keep-max"
  | "last-write-wins"
  | "rowid-high-water-mark"
  | "session-dag";

/** Aggregated totals for one CLI, one scan. */
export type LocalUsageTotals = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  /**
   * The weakest confidence contributing to `costUsd`. A totals row mixing
   * modeled and heuristic entries must report the weaker one, otherwise the
   * aggregate looks better-sourced than its worst input.
   */
  costConfidence: LocalUsageCostConfidence;
  /** Turns whose model had no pricing entry, so contributed 0 to costUsd. */
  unpricedRequests: number;
  /** Distinct model ids behind `unpricedRequests`, for diagnosis. */
  unpricedModels: string[];
};

/** A non-fatal per-file problem, surfaced instead of aborting the scan. */
export type LocalUsageScanError = {
  cliId: LocalUsageCliId;
  filePath: string;
  message: string;
};

/** What one reader's `scan()` returns. */
export type LocalUsageScanResult = {
  cliId: LocalUsageCliId;
  totals: LocalUsageTotals;
  /** Files opened during this scan, after any time filter. */
  filesScanned: number;
  errors: LocalUsageScanError[];
};

/** Static metadata, available without constructing a reader. */
export type LocalUsageReaderDescriptor = {
  id: LocalUsageCliId;
  displayName: string;
  /**
   * True only for readers checked against real data on a real machine. An
   * honesty marker, not a completeness claim — an unverified reader may still
   * be correct, it just has not been shown to be.
   */
  verified: boolean;
  dedupStrategy: LocalUsageDedupStrategy;
  costConfidence: LocalUsageCostConfidence;
  /** Whether reading this CLI's store needs a SQLite binding. */
  requiresSqlite: boolean;
};

/** Options accepted by every reader's `scan()` and by the aggregator. */
export type LocalUsageScanOptions = {
  /**
   * Only read files modified within this many days. Defaults to 30.
   *
   * This is a real constraint rather than a convenience: one developer machine
   * held 17,439 transcripts totalling 9.7 GB, and an unbounded scan reads all
   * of it on every call. Pass `Infinity` for a deliberate full history sweep.
   */
  sinceDays?: number;
};

/** The contract every reader implements — one per CLI. */
export type LocalUsageReader = {
  descriptor: LocalUsageReaderDescriptor;
  /**
   * Whether this CLI's local store appears to exist on this machine at all —
   * the same "do not report on something never installed" discipline the proxy
   * client configurators use before writing a config.
   */
  detect: () => Promise<boolean>;
  scan: (options?: LocalUsageScanOptions) => Promise<LocalUsageScanResult>;
};

/** Async factory stored in the registry — a reader needs no credentials, only
 * the filesystem, so this takes no arguments. */
export type LocalUsageReaderFactoryFn = () => Promise<LocalUsageReader>;

/** One entry in the registry map. */
export type LocalUsageReaderRegistration = {
  descriptor: LocalUsageReaderDescriptor;
  factory: LocalUsageReaderFactoryFn;
};

/** A whole reader failing — not installed, or threw — so the aggregate report
 * can carry successes and failures side by side rather than losing both. */
export type LocalUsageReaderFailure = {
  cliId: LocalUsageCliId;
  message: string;
};

/** Top-level output of scanning every registered, detected reader. */
export type LocalUsageAggregateReport = {
  generatedAt: string;
  /** Only CLIs whose store was detected AND scanned appear here. */
  totals: Partial<Record<LocalUsageCliId, LocalUsageTotals>>;
  /** CLIs whose reader could not be created, detected, or scanned, and why. */
  failures: LocalUsageReaderFailure[];
  /** CLIs with no local store on this machine — absent, not failed. */
  notInstalled: LocalUsageCliId[];
};

/**
 * The `message.usage` object exactly as Claude Code writes it into a
 * transcript line — snake_case, and every field optional because older
 * transcripts predate some of them.
 */
export type LocalUsageClaudeRawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

/**
 * One Codex rollout reduced to its session-level totals.
 *
 * The token figures here are the session's CUMULATIVE counter, not a sum of
 * per-turn values — see `codexReader.ts` for why summing overstates by ~63%.
 */
export type LocalUsageCodexSessionRollup = {
  model?: string;
  input: number;
  output: number;
  cached: number;
  /** token_count events where the cumulative total actually advanced. */
  billableEvents: number;
};

/**
 * The slice of `node:sqlite`'s `DatabaseSync` the OpenCode reader uses.
 *
 * Deliberately minimal. `node:sqlite` is still flagged experimental and may
 * change shape between Node releases, so the reader validates this much at
 * runtime rather than trusting a type assertion — naming only what is actually
 * called keeps that check small and honest.
 */
export type LocalUsageSqliteDatabase = {
  prepare: (sql: string) => { all: (...params: unknown[]) => unknown[] };
  close: () => void;
};

/** Constructor shape for the same. */
export type LocalUsageSqliteDatabaseCtor = new (
  path: string,
  options?: { readOnly?: boolean },
) => LocalUsageSqliteDatabase;

/** Arguments for the `neurolink usage local` command. */
export type LocalUsageCommandArgs = {
  since: number;
  json: boolean;
  cli?: string;
};

/**
 * Options for scanning every registered reader at once.
 *
 * `only` is not a convenience filter applied to the results — it decides which
 * readers are constructed and run at all. Scanning everything and discarding
 * the rest turned a 10s single-CLI query into 28s of reading two other stores
 * nobody asked for, one of them 742 MB.
 */
export type LocalUsageAggregateOptions = LocalUsageScanOptions & {
  only?: LocalUsageCliId[];
};
