/**
 * Task-checklist primitive (TodoWrite-style) — types.
 *
 * A long-running agent needs a durable, model-visible list of what this run
 * must finish. The checklist lives on the SESSION, outside the message list,
 * so summarization/compaction can rewrite the conversation without touching
 * it, and every tool call returns the whole list so the model re-anchors for
 * free after a compaction.
 *
 * Naming: the scheduler in `task.ts` already owns `Task`, `TaskStatus`,
 * `TaskDefinition`, `TaskStore`, `TaskRunResult` and `TasksFile`, so every
 * type here carries the `Checklist` prefix (Critical Rule 9).
 */

/** Lifecycle of one checklist item. `closed` means "not done, and here is why". */
export type ChecklistItemStatus = "pending" | "in_progress" | "done" | "closed";

export type ChecklistItem = {
  /** "t1", "t2", … — assigned by the engine, never by the model. */
  id: string;
  title: string;
  status: ChecklistItemStatus;
  /** Result note, or the REASON an item was closed unfinished. */
  note?: string;
  createdAt: number;
  updatedAt: number;
};

/** Everything one session's checklist holds. Never stored in messages. */
export type ChecklistState = {
  sessionId: string;
  items: ChecklistItem[];
  updatedAt: number;
};

export type ChecklistCreateInput = { titles: string[] };

export type ChecklistUpdateInput = {
  id: string;
  status: ChecklistItemStatus;
  note?: string;
};

/**
 * Background delegates outstanding for a session. Populated by the async
 * delegation primitive; zero while that primitive is unused.
 */
export type ChecklistDelegateCounts = { pending: number; ready: number };

/** Supplies {@link ChecklistDelegateCounts} to every checklist tool result. */
export type ChecklistDelegateCountsSource = (
  sessionId: string,
) => ChecklistDelegateCounts;

/**
 * Background commands outstanding for a session. Populated by the
 * background-command primitive; zero while that primitive is unused.
 */
export type ChecklistCommandCounts = { running: number; finished: number };

/** Supplies {@link ChecklistCommandCounts} to every checklist tool result. */
export type ChecklistCommandCountsSource = (
  sessionId: string,
) => ChecklistCommandCounts;

/**
 * Every `tasks_*` tool returns this — the model re-anchors on the full list
 * on each call, which is what makes the checklist survive compaction with no
 * re-injection machinery.
 */
export type ChecklistToolResult = {
  items: ChecklistItem[];
  counts: Record<ChecklistItemStatus, number>;
  /** Background delegates not yet collected (0 when delegation is unused). */
  delegatesPending: number;
  delegatesReady: number;
  /**
   * Background commands still running (0 when the command primitive is
   * unused). Carried here for the same reason the delegate counters are: the
   * model learns "the build finished" from any `tasks_list`, with no polling
   * and no change to the core loop.
   */
  commandsRunning: number;
  /** Background commands that have settled and can be read. */
  commandsFinished: number;
};

/** Refusal shape shared with the agent tool registrar: recovery text included. */
export type ChecklistRefusal = { isError: true; error: string };
