[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TrackedConnection

# Type Alias: TrackedConnection

> **TrackedConnection** = `object`

Defined in: [types/server.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1058)

Tracked connection for graceful shutdown

## Properties

### id

> **id**: `string`

Defined in: [types/server.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1060)

Unique connection identifier

---

### createdAt

> **createdAt**: `number`

Defined in: [types/server.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1063)

Timestamp when connection was created

---

### socket?

> `optional` **socket?**: `unknown`

Defined in: [types/server.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1066)

Underlying socket or connection object

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/server.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1069)

Request ID if associated with a request

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/server.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1072)

Whether the connection is currently processing a request
