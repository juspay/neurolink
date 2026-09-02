[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1182)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1183)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1184)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1185)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1186)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1187)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1188)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1189)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1190)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1191)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1192)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1193)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1194)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1195)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1196)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1197)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1198)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1199)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1200)
