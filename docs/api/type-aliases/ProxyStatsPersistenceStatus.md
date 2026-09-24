[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1638)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1639)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1641)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1643)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1645)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1646)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1647)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1648)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1649)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1651)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1652)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1653)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1654)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)
