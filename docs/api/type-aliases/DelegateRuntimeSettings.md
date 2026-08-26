[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateRuntimeSettings

# Type Alias: DelegateRuntimeSettings

> **DelegateRuntimeSettings** = `object`

Defined in: [types/delegation.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L177)

Per-host delegation policy, resolved from registration options.

## Properties

### maxDepth

> **maxDepth**: `number`

Defined in: [types/delegation.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L179)

Caller depth at which `delegate_task` refuses rather than spawning.

---

### poolQueueTimeoutMs

> **poolQueueTimeoutMs**: `number`

Defined in: [types/delegation.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L181)

How long a spawned worker waits for a pool slot before giving up (ms).

---

### defaultCollectWaitMs

> **defaultCollectWaitMs**: `number`

Defined in: [types/delegation.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L183)

Default `waitMs` for a collect that does not name one (ms).

---

### spawnDefaults?

> `optional` **spawnDefaults?**: [`DelegateSpawnDefaults`](DelegateSpawnDefaults.md)

Defined in: [types/delegation.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L185)

Defaults merged under every model-invoked `delegate_task` spawn.
