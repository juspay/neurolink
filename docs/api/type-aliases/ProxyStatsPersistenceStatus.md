[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1485)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1486)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1488)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1490)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1491)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1492)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1493)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1494)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1495)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1496)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1497)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1498)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1499)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1500)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1501)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1502)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1503)
