[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1556)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1557)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1558)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1559)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1560)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1561)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1562)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1563)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1564)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1565)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1566)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1567)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1568)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1569)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1572)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1573)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1574)
