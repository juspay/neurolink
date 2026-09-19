/** Operator-configured proxy token caps. All caps are optional and disabled by default. */
export type ProxyTokenBudgetPolicy = {
  /** Per-provider/account estimated outstanding input plus maximum output. */
  maxInFlightTokens?: number;
  /** Charged tokens in the account's fixed window, including outstanding reservations. */
  accountWindowTokens?: number;
  /** Charged tokens across providers/accounts sharing the same client session. */
  sessionWindowTokens?: number;
  windowMs?: number;
};

export type ProxyTokenBudgetReservation = {
  provider: string;
  accountKey: string;
  sessionKey: string;
  requestId: string;
  reservationTokens: number;
  policy?: ProxyTokenBudgetPolicy;
  estimateProvenance?: string;
};

export type ProxyTokenBudgetSnapshot = {
  scope: "disabled" | "process" | "supervisor";
  reservationTokens: number;
  accountChargedTokens: number;
  accountInFlightTokens: number;
  sessionChargedTokens: number;
  sessionInFlightTokens: number;
  windowMs: number;
  estimateProvenance: string;
  settlement?:
    | "provider_reported"
    | "estimate_retained"
    | "cancelled_before_dispatch"
    | "unconfirmed";
};

export type ProxyTokenBudgetLease = {
  leaseId: string;
  snapshot: ProxyTokenBudgetSnapshot;
  settle: (actualTotalTokens?: number) => Promise<void>;
  cancelBeforeDispatch: () => Promise<void>;
};

export type ProxyTokenBudgetBucket = {
  chargedTokens: number;
  inFlightTokens: number;
  startedAt: number;
  windowMs: number;
  lastTouched: number;
};

export type ProxyTokenBudgetRecord = {
  owner: string;
  accountKey: string;
  sessionKey: string;
  estimate: number;
  snapshot: ProxyTokenBudgetSnapshot;
};

export type ProxyTokenBudgetRpcRequest = {
  type: "proxy-budget:request";
  rpcId: string;
  pid: number;
  generation: number;
  action: "reserve" | "settle" | "cancel";
  reservation?: ProxyTokenBudgetReservation;
  leaseId?: string;
  actualTotalTokens?: number;
};

export type ProxyTokenBudgetRpcResponse = {
  type: "proxy-budget:response";
  rpcId: string;
  ok: boolean;
  leaseId?: string;
  snapshot?: ProxyTokenBudgetSnapshot;
  errorCode?: string;
  error?: string;
};

export type ProxyTokenBudgetRpcPending = {
  resolve: (result: ProxyTokenBudgetRpcResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};
