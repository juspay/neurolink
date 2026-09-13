[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatsPersistenceStatus

# Type Alias: ProxyStatsPersistenceStatus

> **ProxyStatsPersistenceStatus** = `object`

Defined in: [types/proxy.ts:1283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1283)

Durability and reconciliation state for the proxy usage counters.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1284)

---

### filePath

> **filePath**: `string` \| `null`

Defined in: [types/proxy.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1285)

---

### revision

> **revision**: `number`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

---

### pendingMutations

> **pendingMutations**: `number`

Defined in: [types/proxy.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1287)

---

### inFlightMutations

> **inFlightMutations**: `number`

Defined in: [types/proxy.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1288)

---

### unpersistedMutations

> **unpersistedMutations**: `number`

Defined in: [types/proxy.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1289)

---

### lastFlushedAt

> **lastFlushedAt**: `number` \| `null`

Defined in: [types/proxy.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1290)

---

### lastReconciledAt

> **lastReconciledAt**: `number` \| `null`

Defined in: [types/proxy.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1291)

---

### lastRecoveryAt

> **lastRecoveryAt**: `number` \| `null`

Defined in: [types/proxy.ts:1292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1292)

---

### lastError

> **lastError**: `string` \| `null`

Defined in: [types/proxy.ts:1293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1293)

---

### terminalErrorsFilePath?

> `optional` **terminalErrorsFilePath?**: `string` \| `null`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

---

### terminalErrorsRevision?

> `optional` **terminalErrorsRevision?**: `number`

Defined in: [types/proxy.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1295)

---

### terminalErrorsPending?

> `optional` **terminalErrorsPending?**: `number`

Defined in: [types/proxy.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1296)

---

### terminalErrorsInFlight?

> `optional` **terminalErrorsInFlight?**: `number`

Defined in: [types/proxy.ts:1297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1297)

---

### terminalErrorsUnpersisted?

> `optional` **terminalErrorsUnpersisted?**: `number`

Defined in: [types/proxy.ts:1298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1298)

---

### terminalErrorsLastFlushedAt?

> `optional` **terminalErrorsLastFlushedAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1299)

---

### terminalErrorsLastRecoveryAt?

> `optional` **terminalErrorsLastRecoveryAt?**: `number` \| `null`

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

---

### terminalErrorsLastError?

> `optional` **terminalErrorsLastError?**: `string` \| `null`

Defined in: [types/proxy.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1301)
