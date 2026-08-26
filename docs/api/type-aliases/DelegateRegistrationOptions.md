[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateRegistrationOptions

# Type Alias: DelegateRegistrationOptions

> **DelegateRegistrationOptions** = `object`

Defined in: [types/delegation.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L189)

Options for `NeuroLink.registerDelegationTools()`.

## Properties

### maxDepth?

> `optional` **maxDepth?**: `number`

Defined in: [types/delegation.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L195)

Caller depth at which further delegation is refused. Default 1: a
background worker does not spawn background workers, because nothing
would ever collect them.

---

### maxConcurrent?

> `optional` **maxConcurrent?**: `number`

Defined in: [types/delegation.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L200)

Raise the process-wide delegation pool to at least this many concurrent
workers. The pool is shared with `registerAgentTool` and only ever rises.

---

### poolQueueTimeoutMs?

> `optional` **poolQueueTimeoutMs?**: `number`

Defined in: [types/delegation.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L202)

Queue wait before a spawned worker gives up on a pool slot (ms).

---

### spawnDefaults?

> `optional` **spawnDefaults?**: [`DelegateSpawnDefaults`](DelegateSpawnDefaults.md)

Defined in: [types/delegation.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L204)

Provider/model for model-invoked spawns — see [DelegateSpawnDefaults](DelegateSpawnDefaults.md).
