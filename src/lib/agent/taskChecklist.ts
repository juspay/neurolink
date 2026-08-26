/**
 * Task checklist primitive (N1) — session-scoped, compaction-proof.
 *
 * A long-running agent that plans in prose loses the plan the moment the
 * conversation is summarized. This keeps the plan OUT of the message list:
 * checklist state lives in a module-level Map keyed by sessionId, so
 * compaction — which only ever rewrites messages — cannot touch it. Every
 * `tasks_*` tool returns the WHOLE list, so the first call after a compaction
 * re-anchors the model for free; there is no re-injection machinery to get
 * wrong (N1.3 is satisfied structurally, not by a mechanism).
 *
 * The host reads the same state synchronously via `getChecklistState()`, which
 * is what makes a completeness gate ("no pending items may survive this
 * stage") one line of host code with no LLM in the loop.
 *
 * Registration is opt-in (`NeuroLink.registerTaskTools()`), and goes through
 * `host.registerTool()` so the tools land in the "user-defined" category —
 * the only one that reaches the LLM's tool schema.
 */

import { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import type {
  ChecklistCommandCounts,
  ChecklistCommandCountsSource,
  ChecklistDelegateCounts,
  ChecklistDelegateCountsSource,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistRefusal,
  ChecklistState,
  ChecklistToolResult,
  MCPExecutableTool,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/** Module-level on purpose: compaction rewrites messages, never a module map. */
const checklists = new Map<string, ChecklistState>();

const STATUSES: readonly ChecklistItemStatus[] = [
  "pending",
  "in_progress",
  "done",
  "closed",
];

/** Ids the engine hands out: t1, t2, … — never accepted from the model. */
const ID_PREFIX = "t";

/**
 * A session id the engine invented for a single tool call: NeuroLink's
 * tool-context merge defaults to `fallback-${Date.now()}` when no session was
 * declared anywhere. Honouring it would file every model tool call under a
 * different checklist — a silently empty list — so it is ignored in favour of
 * a stable per-host key.
 *
 * The registry's other placeholder (a bare `randomUUID()` minted in
 * `createExecutionContext` when a DIRECT `executeTool()` call carries no
 * session) is indistinguishable from a host that genuinely uses UUIDs as
 * session ids, so it is honoured as given: programmatic callers pass
 * `authContext: { sessionId }`.
 */
const SYNTHETIC_SESSION_ID = /^fallback-\d+$/;

const hostDefaultSessions = new WeakMap<object, string>();
let hostDefaultCounter = 0;

/** Set by the delegation primitive; absent means "no background workers". */
let delegateCountsSource: ChecklistDelegateCountsSource | undefined;

/** Set by the background-command primitive; absent means "no commands". */
let commandCountsSource: ChecklistCommandCountsSource | undefined;

/**
 * Let the async-delegation primitive feed `delegatesPending` / `delegatesReady`
 * into every checklist result, so the model learns a worker finished from any
 * `tasks_list` — without this module importing delegation (which would make a
 * cycle) and without a polling loop.
 */
export function setChecklistDelegateCountsSource(
  source: ChecklistDelegateCountsSource | undefined,
): void {
  delegateCountsSource = source;
}

function delegateCountsFor(sessionId: string): ChecklistDelegateCounts {
  if (!delegateCountsSource) {
    return { pending: 0, ready: 0 };
  }
  try {
    return delegateCountsSource(sessionId);
  } catch (error) {
    logger.warn("[TaskChecklist] Delegate counts source failed — reporting 0", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { pending: 0, ready: 0 };
  }
}

/**
 * Let the background-command primitive feed `commandsRunning` /
 * `commandsFinished` into every checklist result — the same notification
 * channel the delegate counters use, so the model learns "the build finished"
 * from any `tasks_list` without this module importing the command runtime
 * (which would make a cycle) and without a polling loop.
 */
export function setChecklistCommandCountsSource(
  source: ChecklistCommandCountsSource | undefined,
): void {
  commandCountsSource = source;
}

function commandCountsFor(sessionId: string): ChecklistCommandCounts {
  if (!commandCountsSource) {
    return { running: 0, finished: 0 };
  }
  try {
    return commandCountsSource(sessionId);
  } catch (error) {
    logger.warn("[TaskChecklist] Command counts source failed — reporting 0", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { running: 0, finished: 0 };
  }
}

function defaultSessionIdFor(host: NeuroLink): string {
  const existing = hostDefaultSessions.get(host);
  if (existing) {
    return existing;
  }
  hostDefaultCounter += 1;
  const created = `checklist-default-${hostDefaultCounter}`;
  hostDefaultSessions.set(host, created);
  return created;
}

function readSessionId(source: Record<string, unknown> | undefined): string {
  const value = source?.sessionId;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Which checklist a tool call belongs to.
 *
 * Execution context wins: a worker created with the shared tool registry runs
 * the host's registered tool closure but arrives with its OWN sessionId, and
 * that worker's checklist must not merge into its parent's. The host's
 * `setToolContext()` session is the next authority, and a per-host key is the
 * last resort so a host that never declared a session still gets ONE list
 * instead of a new one per call.
 */
export function resolveChecklistSessionId(
  host: NeuroLink,
  context?: unknown,
): string {
  const contextRecord =
    context && typeof context === "object"
      ? (context as Record<string, unknown>)
      : undefined;
  const fromContext = readSessionId(contextRecord);
  if (fromContext && !SYNTHETIC_SESSION_ID.test(fromContext)) {
    return fromContext;
  }
  const fromHost = readSessionId(host.getToolContext());
  if (fromHost && !SYNTHETIC_SESSION_ID.test(fromHost)) {
    return fromHost;
  }
  return defaultSessionIdFor(host);
}

function cloneState(state: ChecklistState): ChecklistState {
  return {
    sessionId: state.sessionId,
    items: state.items.map((item) => ({ ...item })),
    updatedAt: state.updatedAt,
  };
}

function emptyState(sessionId: string): ChecklistState {
  return { sessionId, items: [], updatedAt: 0 };
}

/** Never throws: an unknown session simply has an empty checklist. */
export function getChecklistState(sessionId: string): ChecklistState {
  const state = checklists.get(sessionId);
  return state ? cloneState(state) : emptyState(sessionId);
}

/** Drop one session's checklist. Returns whether there was one to drop. */
export function clearChecklistState(sessionId: string): boolean {
  return checklists.delete(sessionId);
}

/** The live state, created on first write. Reads must not create entries. */
function stateForWrite(sessionId: string): ChecklistState {
  let state = checklists.get(sessionId);
  if (!state) {
    state = { sessionId, items: [], updatedAt: Date.now() };
    checklists.set(sessionId, state);
  }
  return state;
}

/** Continue the id run rather than reusing an id a closed item still holds. */
function nextItemId(items: ChecklistItem[]): string {
  let highest = 0;
  for (const item of items) {
    const parsed = Number.parseInt(item.id.slice(ID_PREFIX.length), 10);
    if (Number.isFinite(parsed) && parsed > highest) {
      highest = parsed;
    }
  }
  return `${ID_PREFIX}${highest + 1}`;
}

function toResult(state: ChecklistState): ChecklistToolResult {
  const counts: Record<ChecklistItemStatus, number> = {
    pending: 0,
    in_progress: 0,
    done: 0,
    closed: 0,
  };
  for (const item of state.items) {
    counts[item.status] += 1;
  }
  const delegates = delegateCountsFor(state.sessionId);
  const runCommands = commandCountsFor(state.sessionId);
  return {
    items: state.items.map((item) => ({ ...item })),
    counts,
    delegatesPending: delegates.pending,
    delegatesReady: delegates.ready,
    commandsRunning: runCommands.running,
    commandsFinished: runCommands.finished,
  };
}

/** Matches `agentToolRegistrar`'s convention: the recovery step is IN the text. */
function refusal(message: string): ChecklistRefusal {
  return { isError: true, error: message };
}

const CREATE_SCHEMA = z.object({
  titles: z
    .array(z.string())
    .describe(
      "One short imperative title per task, in the order you intend to work them, " +
        'e.g. ["Check auth changes against the security rules", "Review the migration files"].',
    ),
});

const UPDATE_SCHEMA = z.object({
  id: z.string().describe('Task id from the checklist, e.g. "t2".'),
  status: z
    .enum(["pending", "in_progress", "done", "closed"])
    .describe(
      "in_progress when you start it, done when it is finished, closed when it " +
        "will NOT be done (a reason is then required).",
    ),
  note: z
    .string()
    .optional()
    .describe(
      "What you found, or — for closed — why the task will not be done. Required for closed.",
    ),
});

const LIST_SCHEMA = z.object({});

/**
 * The three model-facing checklist tools, bound to `host` for session
 * resolution. Register them with `host.registerTool()` (see
 * `NeuroLink.registerTaskTools()`), never on the tool registry directly:
 * only the "user-defined" category reaches the LLM's tool schema.
 */
export function createChecklistTools(
  host: NeuroLink,
): Record<string, MCPExecutableTool> {
  return {
    tasks_create: {
      name: "tasks_create",
      description:
        "Write the checklist of concrete tasks this run must finish. Call it once " +
        "up front, and again only to ADD tasks you discover later — titles are " +
        "appended, never replaced, and the engine assigns the ids. Returns the full " +
        "checklist. Pending tasks mean the work is not finished.",
      inputSchema: CREATE_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = CREATE_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "tasks_create expects { titles: string[] }. Call it again with a non-empty " +
              "array of short task titles.",
          );
        }
        const titles = parsed.data.titles
          .map((title) => title.trim())
          .filter((title) => title.length > 0);
        if (titles.length === 0) {
          return refusal(
            "No task titles were given. Call tasks_create again with at least one " +
              "non-empty title describing work this run must finish.",
          );
        }
        const sessionId = resolveChecklistSessionId(host, context);
        const state = stateForWrite(sessionId);
        const now = Date.now();
        for (const title of titles) {
          state.items.push({
            id: nextItemId(state.items),
            title,
            status: "pending",
            createdAt: now,
            updatedAt: now,
          });
        }
        state.updatedAt = now;
        logger.debug("[TaskChecklist] Items created", {
          sessionId,
          added: titles.length,
          total: state.items.length,
        });
        return toResult(state);
      },
    },

    tasks_update: {
      name: "tasks_update",
      description:
        "Move one checklist task to a new status: in_progress when you start it, " +
        "done when it is genuinely finished, closed when it will not be done (say " +
        "why in note — a closed task without a reason is refused). Returns the full " +
        "checklist so you always see what is left.",
      inputSchema: UPDATE_SCHEMA,
      execute: async (params: unknown, context?: unknown) => {
        const parsed = UPDATE_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            `tasks_update expects { id, status, note? } with status one of ${STATUSES.join(
              " | ",
            )}. Call tasks_list to see the current ids, then retry.`,
          );
        }
        const { id, status, note } = parsed.data;
        const sessionId = resolveChecklistSessionId(host, context);
        const state = checklists.get(sessionId);
        const item = state?.items.find((candidate) => candidate.id === id);
        if (!state || !item) {
          const valid = state?.items.map((candidate) => candidate.id) ?? [];
          return refusal(
            valid.length > 0
              ? `No checklist task "${id}". Valid ids are ${valid.join(", ")} — retry with one of them.`
              : `No checklist task "${id}": the checklist is empty. Call tasks_create first.`,
          );
        }
        const reason = note?.trim();
        if (status === "closed" && !reason) {
          return refusal(
            `Closing "${id}" needs a reason. Call tasks_update again with note set to why ` +
              "this task will not be completed, or finish it and mark it done.",
          );
        }
        item.status = status;
        if (reason) {
          item.note = reason;
        }
        item.updatedAt = Date.now();
        state.updatedAt = item.updatedAt;
        logger.debug("[TaskChecklist] Item updated", {
          sessionId,
          id,
          status,
        });
        return toResult(state);
      },
    },

    tasks_list: {
      name: "tasks_list",
      description:
        "Read the current checklist — every task with its status, plus how many " +
        "background workers are still running or waiting to be collected and how many " +
        "background commands are still running or have finished unread. Use it to " +
        "re-orient after a long stretch of work; it is cheap and always current.",
      inputSchema: LIST_SCHEMA,
      execute: async (_params: unknown, context?: unknown) => {
        const sessionId = resolveChecklistSessionId(host, context);
        return toResult(checklists.get(sessionId) ?? emptyState(sessionId));
      },
    },
  };
}
