/** Explicit proxy context controls; all token quantities remain estimates. */
export type ProxyContextPolicy = {
  maxInputTokens?: number;
  outputReserveTokens?: number;
  enforceDiscoveredLimits?: boolean;
  toolAllowlist?: string[];
  models?: Record<string, { contextWindow: number; maxOutputTokens?: number }>;
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
  historyModified: false;
};

export type ProxyPreparedContext<T> = {
  body: T;
  inputTokensEstimate: number;
  outputTokensReserve: number;
  totalTokensReservation: number;
  evidence: ProxyContextEvidence;
};
