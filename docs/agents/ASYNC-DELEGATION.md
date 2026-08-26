# Async Delegation (`delegate_task` / `collect_results`)

Delegation through `registerAgentTool` is **synchronous**: the supervising
agent's loop blocks on each worker, so four investigations cost four times one
investigation and the supervisor sits idle while each runs.

These tools change only **when the caller waits**. `delegate_task` returns a
`workerId` immediately and the agent keeps working; `collect_results` hands back
whichever worker finished **first**, which has nothing to do with which was
spawned first.

Opt-in and additive: nothing registers these tools until you ask.

## Quick start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
neurolink.registerDelegationTools({ maxConcurrent: 6 });
neurolink.registerTaskTools(); // optional — carries the delegate counters
neurolink.setToolContext({ sessionId: "review-1421" });

await neurolink.generate({
  input: {
    text:
      "Review this pull request. Delegate the big investigations with " +
      "delegate_task, keep working, and collect_results as they land.",
  },
  maxSteps: 40,
});
```

Or drive it from host code:

```typescript
const a = await neurolink.spawnDelegate({ task: "Audit the auth changes" });
const b = await neurolink.spawnDelegate({ task: "Review the migrations" });

// …do other work…

const first = await neurolink.collectDelegates({ mode: "any" });
const rest = await neurolink.collectDelegates({ mode: "all" });
```

## The tools

| Tool              | Input                                           | Behaviour                                                                                      |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `delegate_task`   | `{ task, scope?, context?, tools?, model? }`    | Starts a background worker. Returns `{ workerId, spawnedAt, queued, pending, ready }` at once. |
| `collect_results` | `{ mode?: "any" \| "all", workerId?, waitMs? }` | Claims finished workers **in completion order**, each exactly once.                            |

A collected outcome:

```jsonc
{
  "workerId": "w3",
  "label": "Audit the auth changes",
  "status": "completed", // AgentRunStatus — same taxonomy as runIsolatedAgent
  "ok": true,
  "summary": "…bounded narrative, ≤ 4000 chars…",
  "report": {
    "artifactId": "9d250bdf-…",
    "kind": "worker-report",
    "sizeBytes": 41233,
    "preview": "…bounded head slice…",
    "readBackHint": "retrieve_context({ artifactId: \"9d250bdf-…\", offset: 0, limit: 50000 }) …",
  },
  "durationMs": 8140,
  "toolCallsUsed": 11,
}
```

`summary` and `report` are not alternatives: the summary is what the
conversation carries, the report is where the evidence lives. The **full**
report — narrative, structured data, a tool digest, and every tool execution
record in full — is banked to a file, never truncated into the conversation.

## Out-of-order collection

`waitMs: 0` polls (whatever is ready right now); omitting it waits up to five
minutes. `timedOut` means work was still outstanding when the call returned —
the signal to come back later, not an error.

```typescript
await neurolink.spawnDelegate({ task: "slow one" }); // finishes third
await neurolink.spawnDelegate({ task: "quick one" }); // finishes first

const { completed, pending, timedOut } = await neurolink.collectDelegates({
  mode: "any",
});
// completed[0] is "quick one" — spawn order is not collection order
```

## Knowing a worker landed, without polling

Every `ChecklistToolResult` carries `delegatesPending` and `delegatesReady`, so
a model that calls `tasks_list` for any reason learns that a worker finished:

```jsonc
{ "items": [...], "counts": {...}, "delegatesPending": 1, "delegatesReady": 2 }
```

That is the whole notification channel. The core generate loop is untouched —
there is no injection point to get wrong and nothing to poll.

## Concurrency, depth and cancellation

- **One pool.** Concurrency uses the same process-wide delegation pool as
  `registerAgentTool`. `maxConcurrent` **raises** it and never lowers it — it is
  not a per-agent throttle. Spawns past capacity **queue**; they are never
  refused. `DelegateHandle.queued` says which happened.
- **Depth.** `maxDepth` defaults to **1**: a background worker does not spawn
  background workers, because its delegates would outlive it with nobody left to
  collect them. At the ceiling `delegate_task` refuses, in the registrar's own
  wording, and names what to do instead.
- **Cancellation.** `cancelDelegates(workerId?)` aborts one worker or every
  worker this instance spawned; an `abortSignal` passed to `spawnDelegate` does
  the same when the parent aborts. A cancelled worker **still settles into a
  claimable outcome** with `ok: false` and a banked report of whatever it had —
  silence would strand the supervisor waiting for a worker that is never coming.
- **An uncollected outcome is retained until claimed.** Collection is what
  frees a job's registry entry; a supervisor that spawns and never collects
  accumulates settled outcomes for the life of the process. Collect what you
  spawn.
- **`maxConcurrent: Infinity` maps to a finite stand-in (1024)** — effectively
  unbounded, without letting a non-finite number into the pool arithmetic
  (`NaN` once deadlocked it permanently).

## Sessions

Collection is scoped to the caller's session, resolved the same way the task
checklist resolves it: execution context first, then the instance's
`setToolContext({ sessionId })`, then one default per instance. Session A can
never collect session B's worker.

A worker gets its **own** session (the run id), deliberately: its checklist and
its own delegate counters must not merge into its supervisor's.

## Host API

```typescript
registerDelegationTools(options?: {
  maxDepth?: number;         // default 1
  maxConcurrent?: number;    // raises the shared pool
  poolQueueTimeoutMs?: number; // default 120_000
}): void;

spawnDelegate(options: DelegateSpawnOptions): Promise<DelegateHandle>;
collectDelegates(request: DelegateCollectRequest): Promise<DelegateCollectResult>;
cancelDelegates(workerId?: string): Promise<number>;
```

Types live in `src/lib/types/delegation.ts` and are exported from the package
barrel.

## What it is built on

Nothing here is a second implementation of anything:

- `runIsolatedAgent` — fresh session on a worker instance that **shares this
  host's tool registry**, so live MCP connections are reused; waste detection,
  honest stop reasons, continuation handles;
- the delegation pool in `agentToolRegistrar` — one pool, raised never lowered;
- `bankArtifact` (N3) — the full report on disk, a pointer in the conversation;
- the task checklist (N1) — the counters that make completion visible.

## Tests

`pnpm run build && pnpm run test:agent-delegation` —
`test/continuous-test-suite-agent-delegation.ts`.

The timing claims are proved against a loopback chat server that answers
`DELAY:<ms>` after exactly that many milliseconds, so "which worker finished
first" is a property of the test rather than of a provider's mood. Only the live
case needs credentials, and it skips without them.
