import { createHash, randomUUID } from "node:crypto";
import type {
  ProxyTokenBudgetBucket,
  ProxyTokenBudgetLease,
  ProxyTokenBudgetPolicy,
  ProxyTokenBudgetRecord,
  ProxyTokenBudgetReservation,
  ProxyTokenBudgetRpcPending,
  ProxyTokenBudgetRpcRequest,
  ProxyTokenBudgetRpcResponse,
  ProxyTokenBudgetSnapshot,
} from "../types/index.js";

const DEFAULT_WINDOW_MS = 60 * 60_000;
const MAX_KEYS = 10_000;
const MAX_LEASES = 5_000;
const RPC_TIMEOUT_MS = 2_000;

/** Shared private session scope across every protocol and provider fallback. */
export function getProxyTokenBudgetSessionKey(
  headers: Pick<Headers, "get">,
): string {
  const value =
    headers.get("x-neurolink-session-id") ??
    headers.get("x-claude-code-session-id") ??
    headers.get("session_id") ??
    headers.get("session-id") ??
    "unattributed";
  return createHash("sha256").update(value).digest("hex");
}

function failure(
  code: string,
  message: string,
): Error & {
  code: string;
  status: number;
  statusCode: number;
  retryable: boolean;
} {
  const status =
    code === "PROXY_TOKEN_BUDGET_EXCEEDED"
      ? 429
      : code === "PROXY_TOKEN_BUDGET_INPUT"
        ? 400
        : 503;
  return Object.assign(new Error(message), {
    code,
    status,
    statusCode: status,
    retryable: false,
  });
}

/** Local admission failures must not be hidden by automatic provider fallback. */
export function getProxyTokenBudgetError(error: unknown): {
  code: string;
  status: 400 | 429 | 503;
  retryable: false;
  message: string;
} | null {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    typeof error.code !== "string" ||
    !error.code.startsWith("PROXY_TOKEN_BUDGET_")
  ) {
    return null;
  }
  return {
    code: error.code,
    status:
      error.code === "PROXY_TOKEN_BUDGET_EXCEEDED"
        ? 429
        : error.code === "PROXY_TOKEN_BUDGET_INPUT"
          ? 400
          : 503,
    retryable: false,
    message:
      error instanceof Error
        ? error.message
        : "Proxy token budget admission failed",
  };
}

/** Invalid configured limits fail closed instead of silently disabling protection. */
export function parseProxyTokenBudgetPolicy(
  value: unknown,
): ProxyTokenBudgetPolicy {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw failure(
        "PROXY_TOKEN_BUDGET_CONFIG",
        "Token budget configuration is not valid JSON",
      );
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw failure(
      "PROXY_TOKEN_BUDGET_CONFIG",
      "Token budget configuration must be an object",
    );
  }
  const result: ProxyTokenBudgetPolicy = {};
  for (const [key, limit] of Object.entries(value)) {
    if (
      ![
        "maxInFlightTokens",
        "accountWindowTokens",
        "sessionWindowTokens",
        "windowMs",
      ].includes(key) ||
      typeof limit !== "number" ||
      !Number.isSafeInteger(limit) ||
      limit <= 0
    ) {
      throw failure(
        "PROXY_TOKEN_BUDGET_CONFIG",
        "Token budget limits must be positive safe integers with supported names",
      );
    }
    if (key === "maxInFlightTokens") {
      result.maxInFlightTokens = limit;
    }
    if (key === "accountWindowTokens") {
      result.accountWindowTokens = limit;
    }
    if (key === "sessionWindowTokens") {
      result.sessionWindowTokens = limit;
    }
    if (key === "windowMs") {
      result.windowMs = limit;
    }
  }
  return result;
}

export function getProxyTokenBudgetPolicy():
  | ProxyTokenBudgetPolicy
  | undefined {
  const configured = process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
  return configured === undefined || configured.trim() === ""
    ? undefined
    : parseProxyTokenBudgetPolicy(configured);
}

function effectivePolicy(
  requested?: ProxyTokenBudgetPolicy,
): ProxyTokenBudgetPolicy | undefined {
  const configured = getProxyTokenBudgetPolicy();
  const local =
    requested === undefined
      ? undefined
      : parseProxyTokenBudgetPolicy(requested);
  if (!configured) {
    return local;
  }
  if (!local) {
    return configured;
  }
  const result: ProxyTokenBudgetPolicy = {
    windowMs: Math.max(
      configured.windowMs ?? DEFAULT_WINDOW_MS,
      local.windowMs ?? DEFAULT_WINDOW_MS,
    ),
  };
  for (const key of [
    "maxInFlightTokens",
    "accountWindowTokens",
    "sessionWindowTokens",
  ] as const) {
    const left = configured[key];
    const right = local[key];
    if (left !== undefined || right !== undefined) {
      result[key] = Math.min(
        left ?? Number.MAX_SAFE_INTEGER,
        right ?? Number.MAX_SAFE_INTEGER,
      );
    }
  }
  return result;
}

function enabled(policy?: ProxyTokenBudgetPolicy): boolean {
  return !!(
    policy?.maxInFlightTokens ||
    policy?.accountWindowTokens ||
    policy?.sessionWindowTokens
  );
}

function validateReservation(value: ProxyTokenBudgetReservation): void {
  for (const key of [
    "provider",
    "accountKey",
    "sessionKey",
    "requestId",
  ] as const) {
    if (
      typeof value[key] !== "string" ||
      value[key].length === 0 ||
      value[key].length > 512
    ) {
      throw failure(
        "PROXY_TOKEN_BUDGET_INPUT",
        "Token budget requires bounded provider, account, session and request identities",
      );
    }
  }
  if (
    !Number.isSafeInteger(value.reservationTokens) ||
    value.reservationTokens <= 0
  ) {
    throw failure(
      "PROXY_TOKEN_BUDGET_INPUT",
      "Token reservation must be a positive safe integer",
    );
  }
  if (
    value.estimateProvenance !== undefined &&
    (typeof value.estimateProvenance !== "string" ||
      value.estimateProvenance.length > 128)
  ) {
    throw failure(
      "PROXY_TOKEN_BUDGET_INPUT",
      "Token estimate provenance must be bounded text",
    );
  }
}

/** One atomic coordinator per supervisor; requests never write budget state to disk. */
export class ProxyTokenBudgetCoordinator {
  private readonly buckets = new Map<string, ProxyTokenBudgetBucket>();
  private readonly leases = new Map<string, ProxyTokenBudgetRecord>();
  constructor(
    private readonly scope: "process" | "supervisor" = "supervisor",
    private readonly now: () => number = Date.now,
    private readonly maxKeys = MAX_KEYS,
    private readonly maxLeases = MAX_LEASES,
  ) {}

  private bucket(key: string, windowMs: number): ProxyTokenBudgetBucket {
    const now = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) {
        for (const [candidateKey, candidate] of this.buckets) {
          if (
            candidate.inFlightTokens === 0 &&
            now - candidate.lastTouched >= candidate.windowMs
          ) {
            this.buckets.delete(candidateKey);
          }
        }
      }
      if (this.buckets.size >= this.maxKeys) {
        throw failure(
          "PROXY_TOKEN_BUDGET_CAPACITY",
          "Token budget scope capacity is full; retry after its window expires",
        );
      }
      bucket = {
        chargedTokens: 0,
        inFlightTokens: 0,
        startedAt: now,
        windowMs,
        lastTouched: now,
      };
      this.buckets.set(key, bucket);
    }
    // Changing configuration cannot shorten an existing accounting window.
    bucket.windowMs = Math.max(bucket.windowMs, windowMs);
    if (now - bucket.startedAt >= bucket.windowMs) {
      bucket.startedAt = now;
      bucket.chargedTokens = bucket.inFlightTokens;
      bucket.windowMs = windowMs;
    }
    bucket.lastTouched = now;
    return bucket;
  }

  reserve(
    input: ProxyTokenBudgetReservation,
    owner = "local",
  ): { leaseId: string; snapshot: ProxyTokenBudgetSnapshot } {
    validateReservation(input);
    const policy = parseProxyTokenBudgetPolicy(input.policy ?? {});
    if (this.leases.size >= this.maxLeases) {
      throw failure(
        "PROXY_TOKEN_BUDGET_CAPACITY",
        "Token budget outstanding reservation capacity is full",
      );
    }
    const windowMs = policy.windowMs ?? DEFAULT_WINDOW_MS;
    const accountKey = `account:${JSON.stringify([input.provider, input.accountKey])}`;
    const sessionKey = `session:${JSON.stringify(input.sessionKey)}`;
    const account = this.bucket(accountKey, windowMs);
    const session = this.bucket(sessionKey, windowMs);
    const estimate = input.reservationTokens;
    if (
      (policy.maxInFlightTokens !== undefined &&
        estimate > policy.maxInFlightTokens - account.inFlightTokens) ||
      (policy.accountWindowTokens !== undefined &&
        estimate > policy.accountWindowTokens - account.chargedTokens) ||
      (policy.sessionWindowTokens !== undefined &&
        estimate > policy.sessionWindowTokens - session.chargedTokens)
    ) {
      throw failure(
        "PROXY_TOKEN_BUDGET_EXCEEDED",
        "Token budget would be exceeded before upstream dispatch",
      );
    }
    if (
      estimate >
      Number.MAX_SAFE_INTEGER -
        Math.max(account.chargedTokens, session.chargedTokens)
    ) {
      throw failure(
        "PROXY_TOKEN_BUDGET_CAPACITY",
        "Token accounting integer capacity is full",
      );
    }
    account.chargedTokens += estimate;
    account.inFlightTokens += estimate;
    session.chargedTokens += estimate;
    session.inFlightTokens += estimate;
    const snapshot: ProxyTokenBudgetSnapshot = {
      scope: this.scope,
      reservationTokens: estimate,
      accountChargedTokens: account.chargedTokens,
      accountInFlightTokens: account.inFlightTokens,
      sessionChargedTokens: session.chargedTokens,
      sessionInFlightTokens: session.inFlightTokens,
      windowMs,
      estimateProvenance:
        input.estimateProvenance ?? "caller_estimate_input_plus_max_output",
    };
    const leaseId = randomUUID();
    this.leases.set(leaseId, {
      owner,
      accountKey,
      sessionKey,
      estimate,
      snapshot,
    });
    return { leaseId, snapshot: { ...snapshot } };
  }

  settle(
    leaseId: string,
    owner: string,
    actualTotalTokens?: number,
    cancelled = false,
  ): ProxyTokenBudgetSnapshot | undefined {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      return undefined;
    } // repeated completion never charges twice
    if (lease.owner !== owner) {
      throw failure(
        "PROXY_TOKEN_BUDGET_OWNER",
        "Token budget lease belongs to another worker",
      );
    }
    if (
      actualTotalTokens !== undefined &&
      (!Number.isSafeInteger(actualTotalTokens) || actualTotalTokens < 0)
    ) {
      throw failure(
        "PROXY_TOKEN_BUDGET_USAGE",
        "Reported token usage must be a nonnegative safe integer",
      );
    }
    const actual = cancelled ? 0 : (actualTotalTokens ?? lease.estimate);
    const account = this.bucket(lease.accountKey, lease.snapshot.windowMs);
    const session = this.bucket(lease.sessionKey, lease.snapshot.windowMs);
    for (const bucket of [account, session]) {
      bucket.chargedTokens = Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.max(0, bucket.chargedTokens + actual - lease.estimate),
      );
      bucket.inFlightTokens = Math.max(
        0,
        bucket.inFlightTokens - lease.estimate,
      );
    }
    this.leases.delete(leaseId);
    return {
      ...lease.snapshot,
      accountChargedTokens: account.chargedTokens,
      accountInFlightTokens: account.inFlightTokens,
      sessionChargedTokens: session.chargedTokens,
      sessionInFlightTokens: session.inFlightTokens,
      settlement: cancelled
        ? "cancelled_before_dispatch"
        : actualTotalTokens === undefined
          ? "estimate_retained"
          : "provider_reported",
    };
  }

  ownerExited(owner: string): void {
    for (const [leaseId, lease] of this.leases) {
      if (lease.owner === owner) {
        this.settle(leaseId, owner);
      }
    }
  }
}

const coordinator = new ProxyTokenBudgetCoordinator(
  process.env.NEUROLINK_PROXY_SOCKET_WORKER === "1" ? "process" : "supervisor",
);

/** Parent-side IPC hook is shared by every active and draining generation. */
export function handleProxyTokenBudgetMessage(
  value: unknown,
  owner: { pid: number; generation: number },
  reply: (response: ProxyTokenBudgetRpcResponse) => void,
): boolean {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { type?: unknown }).type !== "proxy-budget:request"
  ) {
    return false;
  }
  const request = value as ProxyTokenBudgetRpcRequest;
  if (
    request.pid !== owner.pid ||
    request.generation !== owner.generation ||
    typeof request.rpcId !== "string" ||
    request.rpcId.length > 128
  ) {
    return true;
  }
  const ownerKey = `${owner.generation}:${owner.pid}`;
  try {
    if (
      request.action === "reserve" &&
      request.reservation &&
      typeof request.reservation === "object"
    ) {
      // The supervisor's configured caps remain authoritative across generations.
      const policy = effectivePolicy(request.reservation.policy);
      const result = coordinator.reserve(
        { ...request.reservation, policy },
        ownerKey,
      );
      reply({
        type: "proxy-budget:response",
        rpcId: request.rpcId,
        ok: true,
        ...result,
      });
    } else if (
      (request.action === "settle" || request.action === "cancel") &&
      typeof request.leaseId === "string" &&
      request.leaseId.length <= 128
    ) {
      const snapshot = coordinator.settle(
        request.leaseId,
        ownerKey,
        request.actualTotalTokens,
        request.action === "cancel",
      );
      reply({
        type: "proxy-budget:response",
        rpcId: request.rpcId,
        ok: true,
        snapshot,
      });
    } else {
      throw failure(
        "PROXY_TOKEN_BUDGET_INPUT",
        "Malformed token budget IPC request",
      );
    }
  } catch (error) {
    reply({
      type: "proxy-budget:response",
      rpcId: request.rpcId,
      ok: false,
      errorCode:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "PROXY_TOKEN_BUDGET_UNAVAILABLE",
      error: error instanceof Error ? error.message : "Token budget failed",
    });
  }
  return true;
}

export function releaseProxyTokenBudgetOwner(
  pid: number,
  generation: number,
): void {
  coordinator.ownerExited(`${generation}:${pid}`);
}

const pending = new Map<string, ProxyTokenBudgetRpcPending>();
const expiredReservations = new Set<string>();
function retainExpiredReservation(rpcId: string): void {
  if (expiredReservations.size >= MAX_LEASES) {
    const oldest = expiredReservations.values().next().value;
    if (oldest) {
      expiredReservations.delete(oldest);
    }
  }
  expiredReservations.add(rpcId);
}
let listening = false;
function startRpcListener(): void {
  if (listening) {
    return;
  }
  listening = true;
  process.on("message", (value: unknown) => {
    if (
      !value ||
      typeof value !== "object" ||
      (value as { type?: unknown }).type !== "proxy-budget:response"
    ) {
      return;
    }
    const response = value as ProxyTokenBudgetRpcResponse;
    const waiter = pending.get(response.rpcId);
    if (!waiter) {
      // A late admission response cannot dispatch upstream. Refund that known
      // unused lease without creating a local fallback accounting scope.
      if (
        expiredReservations.delete(response.rpcId) &&
        response.ok &&
        typeof response.leaseId === "string" &&
        response.leaseId.length <= 128 &&
        process.connected &&
        process.send
      ) {
        process.send(
          {
            type: "proxy-budget:request",
            rpcId: randomUUID(),
            pid: process.pid,
            generation: Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION),
            action: "cancel",
            leaseId: response.leaseId,
          },
          () => undefined,
        );
      }
      return;
    }
    pending.delete(response.rpcId);
    clearTimeout(waiter.timer);
    if (response.ok) {
      waiter.resolve(response);
    } else {
      waiter.reject(
        failure(
          response.errorCode ?? "PROXY_TOKEN_BUDGET_UNAVAILABLE",
          response.error ?? "Token budget coordinator refused the request",
        ),
      );
    }
  });
  process.on("disconnect", () => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(
        failure(
          "PROXY_TOKEN_BUDGET_UNAVAILABLE",
          "Token budget supervisor disconnected",
        ),
      );
    }
    pending.clear();
  });
}

function rpc(
  request: Omit<
    ProxyTokenBudgetRpcRequest,
    "type" | "rpcId" | "pid" | "generation"
  >,
): Promise<ProxyTokenBudgetRpcResponse> {
  startRpcListener();
  return new Promise((resolveRpc, rejectRpc) => {
    if (!process.connected || !process.send || pending.size >= MAX_LEASES) {
      rejectRpc(
        failure(
          "PROXY_TOKEN_BUDGET_UNAVAILABLE",
          "Token budget supervisor IPC is unavailable",
        ),
      );
      return;
    }
    const rpcId = randomUUID();
    const timer = setTimeout(() => {
      pending.delete(rpcId);
      if (request.action === "reserve") {
        retainExpiredReservation(rpcId);
      }
      rejectRpc(
        failure(
          "PROXY_TOKEN_BUDGET_UNAVAILABLE",
          "Token budget supervisor response timed out; dispatch refused",
        ),
      );
    }, RPC_TIMEOUT_MS);
    pending.set(rpcId, { resolve: resolveRpc, reject: rejectRpc, timer });
    const fail = (error: Error | null) => {
      if (!error || !pending.has(rpcId)) {
        return;
      }
      clearTimeout(timer);
      pending.delete(rpcId);
      if (request.action === "reserve") {
        retainExpiredReservation(rpcId);
      }
      rejectRpc(
        failure(
          "PROXY_TOKEN_BUDGET_UNAVAILABLE",
          "Token budget IPC send failed",
        ),
      );
    };
    try {
      process.send(
        {
          ...request,
          type: "proxy-budget:request",
          rpcId,
          pid: process.pid,
          generation: Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION),
        },
        fail,
      );
    } catch (error) {
      fail(error instanceof Error ? error : new Error("IPC failed"));
    }
  });
}

/** Reserve before each upstream attempt; unknown provider usage retains its estimate. */
export async function reserveProxyTokenBudget(
  input: ProxyTokenBudgetReservation,
): Promise<ProxyTokenBudgetLease> {
  const policy = effectivePolicy(input.policy);
  if (!enabled(policy)) {
    return {
      leaseId: "disabled",
      snapshot: {
        scope: "disabled",
        reservationTokens: 0,
        accountChargedTokens: 0,
        accountInFlightTokens: 0,
        sessionChargedTokens: 0,
        sessionInFlightTokens: 0,
        windowMs: policy?.windowMs ?? DEFAULT_WINDOW_MS,
        estimateProvenance: "disabled",
      },
      settle: async () => undefined,
      cancelBeforeDispatch: async () => undefined,
    };
  }
  validateReservation(input);
  const worker = process.env.NEUROLINK_PROXY_SOCKET_WORKER === "1";
  const reservation = { ...input, policy };
  const result = worker
    ? await rpc({ action: "reserve", reservation })
    : coordinator.reserve(reservation, "local");
  if (!result.leaseId || !result.snapshot) {
    throw failure(
      "PROXY_TOKEN_BUDGET_UNAVAILABLE",
      "Token budget supervisor returned incomplete reservation proof",
    );
  }
  const leaseId = result.leaseId;
  let settled = false;
  const lease: ProxyTokenBudgetLease = {
    leaseId,
    snapshot: { ...result.snapshot, scope: worker ? "supervisor" : "process" },
    settle: async (actualTotalTokens) => {
      if (settled) {
        return;
      }
      const next = worker
        ? (await rpc({ action: "settle", leaseId, actualTotalTokens })).snapshot
        : coordinator.settle(leaseId, "local", actualTotalTokens);
      settled = true;
      if (next) {
        lease.snapshot = { ...next, scope: worker ? "supervisor" : "process" };
      }
    },
    cancelBeforeDispatch: async () => {
      if (settled) {
        return;
      }
      const next = worker
        ? (await rpc({ action: "cancel", leaseId })).snapshot
        : coordinator.settle(leaseId, "local", undefined, true);
      settled = true;
      if (next) {
        lease.snapshot = { ...next, scope: worker ? "supervisor" : "process" };
      }
    },
  };
  return lease;
}

/** Accounting acknowledgement loss must not turn delivered provider success into a stream failure. */
export async function settleProxyTokenBudget(
  lease: ProxyTokenBudgetLease,
  actualTotalTokens?: number,
): Promise<void> {
  try {
    await lease.settle(actualTotalTokens);
  } catch {
    lease.snapshot = { ...lease.snapshot, settlement: "unconfirmed" };
  }
}
