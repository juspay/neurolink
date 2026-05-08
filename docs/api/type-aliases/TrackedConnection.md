[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TrackedConnection

# Type Alias: TrackedConnection

> **TrackedConnection** = `object`

Defined in: [types/server.ts:1049](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1049)

Tracked connection for graceful shutdown

## Properties

### id

> **id**: `string`

Defined in: [types/server.ts:1051](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1051)

Unique connection identifier

---

### createdAt

> **createdAt**: `number`

Defined in: [types/server.ts:1054](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1054)

Timestamp when connection was created

---

### socket?

> `optional` **socket?**: `unknown`

Defined in: [types/server.ts:1057](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1057)

Underlying socket or connection object

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/server.ts:1060](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1060)

Request ID if associated with a request

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/server.ts:1063](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1063)

Whether the connection is currently processing a request
