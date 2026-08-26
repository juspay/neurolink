# Task Checklist (`tasks_create` / `tasks_update` / `tasks_list`)

A long-running agent that plans in prose loses the plan the moment the
conversation is summarized. The task checklist keeps the plan **out of the
message list**: it is session state the model edits through three tools and the
host reads synchronously — so "did this run actually finish everything?" is a
question code can answer, with no LLM in the loop.

Opt-in and additive: nothing registers these tools until you ask.

## Quick start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
neurolink.registerTaskTools();
neurolink.setToolContext({ sessionId: "review-1421" }); // gives the checklist an identity

await neurolink.generate({
  input: {
    text: "Review this pull request. Plan the work with tasks_create first.",
  },
  maxSteps: 25,
});

// The completeness gate — one line, no model call:
const open = neurolink
  .getTaskState("review-1421")
  .items.filter((i) => i.status === "pending" || i.status === "in_progress");

if (open.length > 0) {
  // hand the open items back to the agent: finish, delegate, or close with a reason
}
```

## The tools

| Tool           | Input                   | Behaviour                                                                                                           |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tasks_create` | `{ titles: string[] }`  | Appends tasks. **The engine assigns the ids** (`t1`, `t2`, …); the model never picks one. Blank titles are dropped. |
| `tasks_update` | `{ id, status, note? }` | `pending` → `in_progress` → `done`, or `closed` for work that will not be done.                                     |
| `tasks_list`   | `{}`                    | Reads the checklist. Cheap, always current.                                                                         |

All three return the **whole** checklist:

```jsonc
{
  "items": [
    {
      "id": "t1",
      "title": "Audit auth changes",
      "status": "done",
      "note": "no findings",
      "createdAt": 0,
      "updatedAt": 0,
    },
  ],
  "counts": { "pending": 0, "in_progress": 0, "done": 1, "closed": 0 },
  "delegatesPending": 0, // background workers still running (0 without delegation)
  "delegatesReady": 0, //    finished but not yet collected
}
```

Two refusals, each carrying its own recovery step in the error text:

- an unknown `id` is refused **and the valid ids are listed**;
- `status: "closed"` without a `note` is refused — closing a task unfinished
  requires saying why.

## Why it survives compaction

Checklist state lives in a module-level map keyed by `sessionId`, never in the
conversation. Compaction rewrites messages; it cannot touch a module map. And
because every tool result returns the full list, the first `tasks_*` call after
a compaction re-anchors the model for free — there is no re-injection mechanism
to get wrong.

## Sessions

The checklist is keyed by the `sessionId` on the tool execution context:

1. the session stamped on the executing agent (workers created by
   `runIsolatedAgent` get their own, so a worker cannot edit its parent's plan);
2. otherwise the instance's `setToolContext({ sessionId })`;
3. otherwise a single default checklist for that instance — so a host that
   never declared a session still gets **one** list rather than one per call.

A direct `executeTool("tasks_create", …)` call should pass
`authContext: { sessionId }`; without it the tool registry mints a fresh id for
that one call.

Two consequences of the keying worth knowing: checklist state is
**process-global by `sessionId`, with no per-instance isolation** — two
`NeuroLink` instances in one process that use the same session id share one
checklist, and `getTaskState(sessionId)` on either reads it. And entries have
**no TTL** — state lives until `clearTaskState(sessionId)`; a long-lived server
minting many session ids should clear sessions it is done with.

## Host API

```typescript
registerTaskTools(): void;                          // opt-in, idempotent
getTaskState(sessionId?: string): ChecklistState;   // sync; unknown session ⇒ empty, never throws
clearTaskState(sessionId?: string): boolean;        // true when there was one to drop
```

`getTaskState()` returns a copy — mutating it does not touch the live
checklist. Omit `sessionId` to read whichever session the tools would currently
write to.

Types (`ChecklistItem`, `ChecklistItemStatus`, `ChecklistState`,
`ChecklistToolResult`, …) are exported from the package barrel. They carry the
`Checklist` prefix because the unrelated **scheduler** in
`src/lib/types/task.ts` already owns `Task`, `TaskStatus` and friends —
`registerTaskTools()` (checklist) and the `tasks` getter (scheduler) are
different subsystems.

## Tests

```bash
pnpm run build           # the suite drives dist/, like every continuous suite
pnpm run test:agent-tasks
```

`test/continuous-test-suite-agent-tasks.ts` — registration, id assignment,
status transitions, both refusals, session scoping, the host read, and one live
two-turn model run that skips without provider credentials.
