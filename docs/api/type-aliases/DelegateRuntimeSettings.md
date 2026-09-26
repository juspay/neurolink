[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateRuntimeSettings

# Type Alias: DelegateRuntimeSettings

> **DelegateRuntimeSettings** = `object`

Per-host delegation policy, resolved from registration options.

## Properties

### maxDepth

> **maxDepth**: `number`

Caller depth at which `delegate_task` refuses rather than spawning.

---

### poolQueueTimeoutMs

> **poolQueueTimeoutMs**: `number`

How long a spawned worker waits for a pool slot before giving up (ms).

---

### defaultCollectWaitMs

> **defaultCollectWaitMs**: `number`

Default `waitMs` for a collect that does not name one (ms).

---

### spawnDefaults?

> `optional` **spawnDefaults?**: [`DelegateSpawnDefaults`](DelegateSpawnDefaults.md)

Defaults merged under every model-invoked `delegate_task` spawn.
