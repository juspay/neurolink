[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1404)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1405)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1406)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1407)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1408)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1409)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1410)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1411)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1412)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1413)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1414)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1415)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1416)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1417)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1418)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1419)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1420)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1421)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1422)
