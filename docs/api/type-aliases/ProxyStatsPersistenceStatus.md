[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1536)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1537)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1538)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1539)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1540](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1540)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1541)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1542)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1543)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1545)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1546)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1547)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1548)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1549)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1550)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1551)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1552)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1553)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1554)
