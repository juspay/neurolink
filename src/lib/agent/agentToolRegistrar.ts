/**
 * Host-loop delegation (N5): `registerAgentTool()` wraps an isolated agent
 * (runIsolatedAgent) as a tool on the HOST NeuroLink instance, so the host's
 * EXISTING generate() loop delegates — never a second router generate.
 *
 * Framework policy lives here:
 *  - per-turn delegation caps, counted per top-level generate() in the loop
 *    itself (AsyncLocalStorage turn scope);
 *  - depth limits via tool context (`agentDepth`) — at the limit the tool is
 *    withheld from the request entirely;
 *  - a process-wide concurrency pool with queue timeout, shared by every
 *    registered agent tool;
 *  - every refusal carries its recovery instruction in the error text.
 */

import { AsyncLocalStorage } from "async_hooks";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentDelegationTurnState,
  AgentToolRegistrationOptions,
  AgentToolRegistrationRecord,
  GenerateOptions,
  IsolatedAgentDefinition,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import {
  hasOpenIsolatedAgentHandle,
  runIsolatedAgent,
} from "./isolatedAgentRunner.js";

const DEFAULT_POOL_CAPACITY = 4;
const DEFAULT_POOL_QUEUE_TIMEOUT_MS = 30_000;
/** Bound on the content text returned into the host loop per delegation. */
const DELEGATION_RESULT_CONTENT_CHARS = 4000;

// ── Registrations ──────────────────────────────────────────────────────────

const hostRegistrations = new WeakMap<
  object,
  Map<string, AgentToolRegistrationRecord>
>();

function registrationsFor(
  host: NeuroLink,
): Map<string, AgentToolRegistrationRecord> {
  let map = hostRegistrations.get(host as unknown as object);
  if (!map) {
    map = new Map();
    hostRegistrations.set(host as unknown as object, map);
  }
  return map;
}

// ── Per-turn scope (delegation caps) ───────────────────────────────────────

const turnStorage = new AsyncLocalStorage<AgentDelegationTurnState>();

/**
 * Enter a per-turn delegation scope for a top-level generate(). Returns null
 * when a scope is already active (nested/internal generates share the
 * top-level turn's counters) — the caller then proceeds without wrapping.
 */
export function beginDelegationTurn(
  host: NeuroLink,
  options: GenerateOptions | string | Record<string, unknown>,
): {
  options: typeof options;
  run: <T>(fn: () => Promise<T>) => Promise<T>;
} | null {
  if (turnStorage.getStore()) {
    return null;
  }
  const registrations = registrationsFor(host);
  let scopedOptions = options;
  if (registrations.size > 0 && typeof options !== "string") {
    const depth = resolveDepth(host, options as GenerateOptions);
    const withheld = [...registrations.values()]
      .filter(
        (r) => r.options.maxDepth !== undefined && depth >= r.options.maxDepth,
      )
      .map((r) => r.name);
    if (withheld.length > 0) {
      const generateOptions = options as GenerateOptions;
      scopedOptions = {
        ...generateOptions,
        excludeTools: [...(generateOptions.excludeTools ?? []), ...withheld],
      };
      logger.debug(
        "[AgentToolRegistrar] Withholding depth-limited agent tools",
        { withheld, depth },
      );
    }
  }
  const state: AgentDelegationTurnState = {
    counts: new Map(),
    depth: resolveDepth(
      host,
      typeof options === "string" ? undefined : (options as GenerateOptions),
    ),
  };
  return {
    options: scopedOptions,
    run: (fn) => turnStorage.run(state, fn),
  };
}

/**
 * Run `fn` one delegation level deeper, sharing the current turn's counters.
 * Used by AgentNetwork's standalone delegations: the network holds a pool
 * slot around each agent execution, so any registered-agent-tool delegation
 * the agent makes from inside must take the NESTED path (pool bypass, depth
 * checks) — request-scoped via AsyncLocalStorage, never instance state.
 */
export function runWithNestedDelegationDepth<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const store = turnStorage.getStore();
  const state: AgentDelegationTurnState = store
    ? { counts: store.counts, depth: store.depth + 1 }
    : { counts: new Map(), depth: 1 };
  return turnStorage.run(state, fn);
}

function resolveDepth(
  host: NeuroLink,
  options?: GenerateOptions,
  executionContext?: Record<string, unknown>,
): number {
  // Execution context wins: it carries the agentDepth stamped on the worker
  // that is actually making this call (see executeDelegation).
  const fromExecution = executionContext?.agentDepth;
  if (typeof fromExecution === "number") {
    return fromExecution;
  }
  const fromCall = options?.context?.agentDepth;
  if (typeof fromCall === "number") {
    return fromCall;
  }
  const fromInstance = host.getToolContext()?.agentDepth;
  return typeof fromInstance === "number" ? fromInstance : 0;
}

// ── Process-wide delegation pool ───────────────────────────────────────────

let poolCapacity = DEFAULT_POOL_CAPACITY;
let poolInUse = 0;
const poolWaiters: Array<{
  grant: () => void;
  cancel: (reason: Error) => void;
}> = [];

function releasePoolSlot(): void {
  poolInUse = Math.max(0, poolInUse - 1);
  const next = poolWaiters.shift();
  if (next) {
    poolInUse++;
    next.grant();
  }
}

/**
 * Acquire a slot in the process-wide delegation pool, waiting up to
 * `timeoutMs` in the queue. Resolves to a release function.
 */
export function acquireDelegationSlot(
  timeoutMs: number = DEFAULT_POOL_QUEUE_TIMEOUT_MS,
): Promise<() => void> {
  if (poolInUse < poolCapacity) {
    poolInUse++;
    let released = false;
    return Promise.resolve(() => {
      if (!released) {
        released = true;
        releasePoolSlot();
      }
    });
  }
  return new Promise<() => void>((resolve, reject) => {
    const waiter = {
      grant: () => {
        clearTimeout(timer);
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            releasePoolSlot();
          }
        });
      },
      cancel: (reason: Error) => {
        clearTimeout(timer);
        reject(reason);
      },
    };
    const timer = setTimeout(() => {
      const index = poolWaiters.indexOf(waiter);
      if (index !== -1) {
        poolWaiters.splice(index, 1);
      }
      waiter.cancel(new Error("delegation pool queue timeout"));
    }, timeoutMs);
    timer.unref?.();
    poolWaiters.push(waiter);
  });
}

// ── Refusals (recovery instruction always included) ────────────────────────

function refusal(message: string): { isError: true; error: string } {
  return { isError: true, error: message };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Register an isolated agent as a delegation tool on the host instance.
 * The tool becomes available to every generate()/stream() the host runs —
 * inside its existing loop, no second router generate.
 */
export function registerAgentTool(
  host: NeuroLink,
  definition: IsolatedAgentDefinition,
  options: AgentToolRegistrationOptions = {},
): { name: string } {
  if (!definition?.id || !definition?.instructions) {
    throw new Error(
      "registerAgentTool: definition must include id and instructions",
    );
  }
  const name = options.name ?? definition.id;
  const registrations = registrationsFor(host);
  if (registrations.has(name)) {
    throw new Error(
      `registerAgentTool: an agent tool named "${name}" is already registered on this instance`,
    );
  }
  if (options.maxConcurrent !== undefined) {
    // Process-wide pool: the largest registered capacity wins (raises only —
    // never lowers; this is not a per-agent throttle). Grant any queued
    // waiters the raise just unblocked.
    poolCapacity = Math.max(poolCapacity, options.maxConcurrent);
    while (poolInUse < poolCapacity && poolWaiters.length > 0) {
      const next = poolWaiters.shift();
      if (next) {
        poolInUse++;
        next.grant();
      }
    }
  }
  const registration: AgentToolRegistrationRecord = {
    name,
    definition,
    options,
  };
  registrations.set(name, registration);

  const inputSchema = definition.inputSchema
    ? convertZodToJsonSchema(
        definition.inputSchema as Parameters<typeof convertZodToJsonSchema>[0],
      )
    : {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "The task to delegate to this agent",
          },
        },
        required: ["task"],
      };

  host.registerTool(name, {
    name,
    description: `Delegate to agent: ${definition.name} — ${definition.description}`,
    inputSchema: inputSchema as Record<string, unknown>,
    execute: async (params: unknown, context?: unknown) => {
      return executeDelegation(host, registration, params, context);
    },
  });

  logger.debug("[AgentToolRegistrar] Registered agent tool", {
    name,
    agentId: definition.id,
    maxDelegationsPerTurn: options.maxDelegationsPerTurn,
    maxDepth: options.maxDepth,
  });
  return { name };
}

async function executeDelegation(
  host: NeuroLink,
  registration: AgentToolRegistrationRecord,
  params: unknown,
  context: unknown,
): Promise<unknown> {
  const { name, definition, options } = registration;
  const contextRecord =
    context && typeof context === "object"
      ? (context as Record<string, unknown>)
      : {};

  // Depth comes from the EXECUTION context first: when a worker created with
  // the shared tool registry delegates, the registration lives on the host
  // but the call arrives with the worker's tool context carrying the
  // agentDepth this registrar set — the host instance context would read 0
  // every time and nested delegation would never hit the limit. When the
  // execution context carries no depth, the ALS turn scope's depth covers
  // the composed path (AgentNetwork wraps its agents one level deeper).
  const turnScope = turnStorage.getStore();
  const depth =
    typeof contextRecord.agentDepth === "number"
      ? contextRecord.agentDepth
      : (turnScope?.depth ?? resolveDepth(host));
  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return refusal(
      `Delegation depth limit reached (${depth}/${options.maxDepth}). Complete this investigation yourself with your own tools instead of delegating further.`,
    );
  }

  const sessionId =
    typeof contextRecord.sessionId === "string"
      ? contextRecord.sessionId
      : undefined;

  // Open-handle conflict: an in-progress leashed leg for this agent, owned
  // by THIS host + caller session, must be continued, not restarted. Other
  // sessions' handles are invisible here — the pool bounds cross-session
  // concurrency.
  const openHandle = hasOpenIsolatedAgentHandle(host, definition.id, sessionId);
  if (openHandle.open) {
    return refusal(
      `Agent "${definition.id}" already has an in-progress investigation (handle ${openHandle.handle}); continue it via its handle instead of delegating anew.`,
    );
  }

  // Per-turn cap — counted in the loop itself, per top-level generate. The
  // count check runs before the pool wait, but the count is CONSUMED only
  // once a run actually starts: a refusal (depth/handle/pool) must not burn
  // one of the model's delegations. Nested scopes share the top-level
  // turn's counters (see runWithNestedDelegationDepth).
  const turnState = turnScope;
  if (options.maxDelegationsPerTurn !== undefined && turnState) {
    const used = turnState.counts.get(name) ?? 0;
    if (used >= options.maxDelegationsPerTurn) {
      return refusal(
        `Delegation limit reached: ${name} has already been called ${used}× this turn (max ${options.maxDelegationsPerTurn}). Do not call ${name} again this turn; synthesize from the investigations you already have.`,
      );
    }
  }

  // Nested delegations bypass the pool: the outer delegation already holds a
  // slot, so queueing nested work behind a full pool would deadlock it (all
  // slots held by outers waiting on their inners).
  let release: (() => void) | undefined;
  if (depth === 0) {
    try {
      release = await acquireDelegationSlot(
        options.poolQueueTimeoutMs ?? DEFAULT_POOL_QUEUE_TIMEOUT_MS,
      );
    } catch {
      return refusal(
        `All delegation slots are busy and the queue timed out. Do not retry ${name} immediately; continue with your own tools or synthesize from the investigations you already have.`,
      );
    }
  }

  try {
    // Consume the per-turn count only now that the run actually starts.
    if (options.maxDelegationsPerTurn !== undefined && turnState) {
      turnState.counts.set(name, (turnState.counts.get(name) ?? 0) + 1);
    }

    // Default task-string schema: unwrap `task`; a bare string passes
    // through; any other object passes through whole (runIsolatedAgent
    // JSON-stringifies structured input — never "[object Object]").
    const input = definition.inputSchema
      ? (params as Record<string, unknown>)
      : typeof (params as { task?: unknown })?.task === "string"
        ? (params as { task: string }).task
        : typeof params === "string"
          ? params
          : ((params as Record<string, unknown>) ?? {});

    const abortSignal = (contextRecord as { abortSignal?: AbortSignal })
      .abortSignal;

    const outcome = await runIsolatedAgent(host, definition, input, {
      ...(abortSignal && { abortSignal }),
      ...(options.leg && { leg: options.leg }),
      ...(options.handleTtlMs !== undefined && {
        handleTtlMs: options.handleTtlMs,
      }),
      ...(options.waste && { waste: options.waste }),
      ...(options.overrides && { overrides: options.overrides }),
      toolContext: {
        agentDepth: depth + 1,
        ...(sessionId && { sessionId }),
      },
    });

    // Bounded summary into the host loop — full records stay on the outcome
    // for programmatic callers; the model gets the essentials.
    return {
      status: outcome.status,
      ...(outcome.data !== undefined && { data: outcome.data }),
      ...(outcome.content && {
        content:
          outcome.content.length > DELEGATION_RESULT_CONTENT_CHARS
            ? `${outcome.content.slice(0, DELEGATION_RESULT_CONTENT_CHARS)}…`
            : outcome.content,
      }),
      ...(outcome.stopReason && { stopReason: outcome.stopReason }),
      toolCallsUsed: outcome.toolExecutions.length,
      durationMs: outcome.durationMs,
      ...(outcome.handle && { handle: outcome.handle }),
      ...(outcome.delta && { delta: outcome.delta }),
      ...(outcome.nextPlan && { nextPlan: outcome.nextPlan }),
      ...(outcome.wasteSignals && { wasteSignals: outcome.wasteSignals }),
      ...(outcome.budget && { budget: outcome.budget }),
    };
  } catch (error) {
    return refusal(
      `Delegation to ${name} failed: ${
        error instanceof Error ? error.message : String(error)
      }. Continue with your own tools or synthesize from what you already have.`,
    );
  } finally {
    release?.();
  }
}

/** Test-only: reset the process-wide pool. */
export function resetDelegationPoolForTests(capacity?: number): void {
  poolCapacity = capacity ?? DEFAULT_POOL_CAPACITY;
  poolInUse = 0;
  poolWaiters
    .splice(0, poolWaiters.length)
    .forEach((w) => w.cancel(new Error("pool reset")));
}
