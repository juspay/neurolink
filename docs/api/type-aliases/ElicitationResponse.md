[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationResponse

# Type Alias: ElicitationResponse

> **ElicitationResponse** = `object`

Elicitation response

## Properties

### requestId

> **requestId**: `string`

Request ID this responds to

---

### responded

> **responded**: `boolean`

Whether the user provided a response

---

### value?

> `optional` **value?**: [`JsonValue`](JsonValue.md)

The user's response value

---

### cancelled?

> `optional` **cancelled?**: `boolean`

Whether the request was cancelled

---

### timedOut?

> `optional` **timedOut?**: `boolean`

Whether the request timed out

---

### error?

> `optional` **error?**: `string`

Error message if response failed

---

### timestamp

> **timestamp**: `number`

Response timestamp
