[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TrackedConnection

# Type Alias: TrackedConnection

> **TrackedConnection** = `object`

Defined in: [types/server.ts:1049](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1049)

Tracked connection for graceful shutdown

## Properties

### id

> **id**: `string`

Defined in: [types/server.ts:1051](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1051)

Unique connection identifier

---

### createdAt

> **createdAt**: `number`

Defined in: [types/server.ts:1054](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1054)

Timestamp when connection was created

---

### socket?

> `optional` **socket?**: `unknown`

Defined in: [types/server.ts:1057](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1057)

Underlying socket or connection object

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/server.ts:1060](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1060)

Request ID if associated with a request

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/server.ts:1063](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1063)

Whether the connection is currently processing a request
