[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1559)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1560)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1561)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1562)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1563)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1564)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1565)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1566)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1567)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1568)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1569)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1572)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1573)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1574)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1575)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1576)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1577)
