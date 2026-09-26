[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpawnProxySocketWorkerOptions

# Type Alias: SpawnProxySocketWorkerOptions

> **SpawnProxySocketWorkerOptions** = `object`

## Properties

### spawn?

> `optional` **spawn?**: `spawn`

Injectable process boundary for deterministic IPC fault tests.

---

### generation

> **generation**: `number`

---

### expectedVersion

> **expectedVersion**: `string`

---

### command

> **command**: `string`

---

### args

> **args**: `string`[]

---

### env?

> `optional` **env?**: `NodeJS.ProcessEnv`

---

### stdout?

> `optional` **stdout?**: `"inherit"` \| `"ignore"`

---

### stderr?

> `optional` **stderr?**: `"inherit"` \| `"ignore"`

---

### socketAckTimeoutMs?

> `optional` **socketAckTimeoutMs?**: `number`
