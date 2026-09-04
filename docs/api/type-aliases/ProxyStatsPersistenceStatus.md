[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1188)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1189)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1190)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1191)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1192)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1193)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1194)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1195)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1196)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1197)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1198)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1199)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1200)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1201)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1202)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1203)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1204)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1205)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1206)
