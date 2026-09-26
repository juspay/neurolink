[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

---

### filePath

> **filePath**: `string` \| `null`

---

### revision

> **revision**: `number`

---

### pendingMutations

> **pendingMutations**: `number`

---

### inFlightMutations

> **inFlightMutations**: `number`

---

### unpersistedMutations

> **unpersistedMutations**: `number`

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

---

### lastError

> **lastError**: `string` \| `null`

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`
