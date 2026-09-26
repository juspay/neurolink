[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateRegistrationOptions

# Type Alias: DelegateRegistrationOptions

> **DelegateRegistrationOptions** = `object`

Options for `NeuroLink.registerDelegationTools()`.

## Properties

### maxDepth?

> `optional` **maxDepth?**: `number`

Caller depth at which further delegation is refused. Default 1: a
background worker does not spawn background workers, because nothing
would ever collect them.

---

### maxConcurrent?

> `optional` **maxConcurrent?**: `number`

Raise the process-wide delegation pool to at least this many concurrent
workers. The pool is shared with `registerAgentTool` and only ever rises.

---

### poolQueueTimeoutMs?

> `optional` **poolQueueTimeoutMs?**: `number`

Queue wait before a spawned worker gives up on a pool slot (ms).

---

### spawnDefaults?

> `optional` **spawnDefaults?**: [`DelegateSpawnDefaults`](DelegateSpawnDefaults.md)

Provider/model for model-invoked spawns — see [DelegateSpawnDefaults](DelegateSpawnDefaults.md).
