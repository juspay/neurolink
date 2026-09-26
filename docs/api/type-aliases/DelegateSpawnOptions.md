[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateSpawnOptions

# Type Alias: DelegateSpawnOptions

> **DelegateSpawnOptions** = `object`

What a supervisor hands down when it spawns a background worker.

## Properties

### task

> **task**: `string`

The task, in the supervisor's own words. Required and non-empty.

---

### scope?

> `optional` **scope?**: `string`

What the worker may look at — files, directories, systems.

---

### context?

> `optional` **context?**: `string`

Brief slice of context handed down (never the whole rulebook).

---

### model?

> `optional` **model?**: `string`

Model override for this worker.

---

### provider?

> `optional` **provider?**: `string`

Provider override for this worker.

---

### tools?

> `optional` **tools?**: `string`[]

Read-only tool allowlist for the worker (tool names).

---

### sessionId?

> `optional` **sessionId?**: `string`

Caller's session. Collection is scoped to it, and it is the key the task
checklist's `delegatesPending` / `delegatesReady` counters are read by.
Defaults to the session the host's tool context declares.

---

### depth?

> `optional` **depth?**: `number`

Caller's delegation depth; the worker runs one level deeper.

---

### label?

> `optional` **label?**: `string`

Short human label used in logs and in the banked report's name.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Parent cancellation — an aborted parent cancels this worker.

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Max agentic steps for the worker's research pass.

---

### budgetMs?

> `optional` **budgetMs?**: `number`

Wall-clock budget for the worker's research pass (ms).
