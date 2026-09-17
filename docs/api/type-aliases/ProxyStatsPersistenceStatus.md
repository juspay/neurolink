[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1391)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1392)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1393)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1394)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1395)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1396)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1397)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1398)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1399)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1400)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1401)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1402)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1403)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1404)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1405)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1406)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1407)
