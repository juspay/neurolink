[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1380)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1381)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1382)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1383)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1384)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1385)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1386)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1387)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1388)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1391)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1392)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1393)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1394)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1395)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1396)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1397)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1398)
