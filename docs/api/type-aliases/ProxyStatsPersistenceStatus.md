[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1173)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1174)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1175)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1176)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1177)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1178)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1179)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1180)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1181)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1182)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1183)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1184)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1185)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1186)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1187)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1188)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1189)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1190)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1191)
