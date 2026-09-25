[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1624)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1625)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1626)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1627)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1628)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1629)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1630)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1631)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1632)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1633)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1634)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1635)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1636)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1637)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1638)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1639)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1641)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)
