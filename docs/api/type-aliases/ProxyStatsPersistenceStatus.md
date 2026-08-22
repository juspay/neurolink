[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1106)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1107)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1109)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1110)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1112)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1114)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1115)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1116)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1117)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1122)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1123)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1124)
