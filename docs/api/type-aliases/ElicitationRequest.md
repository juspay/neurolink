[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationRequest

# Type Alias: ElicitationRequest

> **ElicitationRequest** = `object`

Base elicitation request

## Properties

### id

> **id**: `string`

Unique request identifier

---

### type

> **type**: [`ElicitationType`](ElicitationType.md)

Type of elicitation

---

### message

> **message**: `string`

Message to display to user

---

### toolName

> **toolName**: `string`

Tool requesting the elicitation

---

### serverId?

> `optional` **serverId?**: `string`

Server ID of the requesting tool

---

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds

---

### optional?

> `optional` **optional?**: `boolean`

Whether the request can be skipped

---

### defaultValue?

> `optional` **defaultValue?**: [`JsonValue`](JsonValue.md)

Default value if skipped or timed out

---

### context?

> `optional` **context?**: [`JsonObject`](JsonObject.md)

Additional context for the request
