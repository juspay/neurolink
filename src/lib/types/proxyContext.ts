/** Explicit proxy context controls; all token quantities remain estimates. */
export type ProxyContextPolicy = {
  maxInputTokens?: number;
  outputReserveTokens?: number;
  enforceDiscoveredLimits?: boolean;
  toolAllowlist?: string[];
  models?: Record<
    string,
    {
      contextWindow: number;
      maxOutputTokens?: number;
      /** Input estimate above which history is reduced. Bounds per-turn cost. */
      compactAtTokens?: number;
      /** Input estimate to reduce to. Must be below compactAtTokens. */
      compactToTokens?: number;
    }
  >;
};

export type ProxyContextEvidence = {
  provider: string;
  model: string;
  inputTokensEstimate: number;
  toolsTokensEstimate: number;
  instructionsTokensEstimate: number;
  schemaTokensEstimate: number;
  outputTokensReserve: number;
  reasoningIncludedInOutputReserve: true;
  contextWindow?: number;
  contextLimitSource: "configured" | "discovered" | "unknown";
  tokenCountSource: "estimated";
  multimodalEstimate: boolean;
  originalToolCount: number;
  retainedToolCount: number;
  historyModified: boolean;
  /** Complete history units dropped by pre-dispatch truncation. */
  historyUnitsRemoved?: number;
  /** Input estimate before truncation, when truncation ran. */
  inputTokensBeforeTruncation?: number;
};

export type ProxyPreparedContext<T> = {
  body: T;
  inputTokensEstimate: number;
  outputTokensReserve: number;
  totalTokensReservation: number;
  evidence: ProxyContextEvidence;
};

/** Estimator injected into history truncation so it matches preflight accounting. */
export type ProxyHistoryEstimate = (value: unknown) => number;

/** The history container a proxy body carries. */
export type ProxyHistoryField = "messages" | "input" | "conversationMessages";

export type ProxyHistoryTruncationResult<T> = {
  body: T;
  historyModified: boolean;
  unitsRemoved: number;
  itemsRemoved: number;
};
