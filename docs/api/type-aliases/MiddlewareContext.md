[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareContext

# Type Alias: MiddlewareContext

> **MiddlewareContext** = `object`

Context passed to middleware for decision making

## Properties

### provider

> **provider**: `string`

Provider name

---

### model

> **model**: `string`

Model name

---

### options

> **options**: `Record`\<`string`, `unknown`\>

Request options

---

### session?

> `optional` **session?**: `object`

Session information

#### sessionId?

> `optional` **sessionId?**: `string`

#### userId?

> `optional` **userId?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional metadata
