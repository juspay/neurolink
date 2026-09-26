[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TrackedConnection

# Type Alias: TrackedConnection

> **TrackedConnection** = `object`

Tracked connection for graceful shutdown

## Properties

### id

> **id**: `string`

Unique connection identifier

---

### createdAt

> **createdAt**: `number`

Timestamp when connection was created

---

### socket?

> `optional` **socket?**: `unknown`

Underlying socket or connection object

---

### requestId?

> `optional` **requestId?**: `string`

Request ID if associated with a request

---

### isActive?

> `optional` **isActive?**: `boolean`

Whether the connection is currently processing a request
