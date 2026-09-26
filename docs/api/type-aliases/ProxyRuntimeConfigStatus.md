[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeConfigStatus

# Type Alias: ProxyRuntimeConfigStatus

> **ProxyRuntimeConfigStatus** = `object`

Safe runtime configuration diagnostics exposed through proxy status.

## Properties

### configPath

> **configPath**: `string`

---

### envFilePath?

> `optional` **envFilePath?**: `string`

---

### generation

> **generation**: `number`

---

### loadedAt

> **loadedAt**: `string`

---

### configHash

> **configHash**: `string`

---

### watching

> **watching**: `boolean`

---

### lastReloadAttemptAt?

> `optional` **lastReloadAttemptAt?**: `string`

---

### lastReloadAt?

> `optional` **lastReloadAt?**: `string`

---

### lastReloadSource?

> `optional` **lastReloadSource?**: [`ProxyRuntimeConfigReloadSource`](ProxyRuntimeConfigReloadSource.md)

---

### lastReloadError?

> `optional` **lastReloadError?**: `string`

---

### consecutiveFailures

> **consecutiveFailures**: `number`
