[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateSpawnOptions

# Type Alias: DelegateSpawnOptions

> **DelegateSpawnOptions** = `object`

Defined in: [types/delegation.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L23)

What a supervisor hands down when it spawns a background worker.

## Properties

### task

> **task**: `string`

Defined in: [types/delegation.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L25)

The task, in the supervisor's own words. Required and non-empty.

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/delegation.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L27)

What the worker may look at — files, directories, systems.

---

### context?

> `optional` **context?**: `string`

Defined in: [types/delegation.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L29)

Brief slice of context handed down (never the whole rulebook).

---

### model?

> `optional` **model?**: `string`

Defined in: [types/delegation.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L31)

Model override for this worker.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/delegation.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L33)

Provider override for this worker.

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/delegation.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L35)

Read-only tool allowlist for the worker (tool names).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/delegation.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L41)

Caller's session. Collection is scoped to it, and it is the key the task
checklist's `delegatesPending` / `delegatesReady` counters are read by.
Defaults to the session the host's tool context declares.

---

### depth?

> `optional` **depth?**: `number`

Defined in: [types/delegation.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L43)

Caller's delegation depth; the worker runs one level deeper.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/delegation.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L45)

Short human label used in logs and in the banked report's name.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/delegation.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L47)

Parent cancellation — an aborted parent cancels this worker.

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/delegation.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L49)

Max agentic steps for the worker's research pass.

---

### budgetMs?

> `optional` **budgetMs?**: `number`

Defined in: [types/delegation.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L51)

Wall-clock budget for the worker's research pass (ms).
