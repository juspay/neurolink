[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerEvent

# Type Alias: ScorerEvent

> **ScorerEvent** = `object`

Scorer execution events for observability

## Properties

### type

> **type**: `"scorer:start"` \| `"scorer:end"` \| `"scorer:error"`

Event type

---

### scorerId

> **scorerId**: `string`

Scorer identifier

---

### timestamp

> **timestamp**: `number`

Event timestamp

---

### duration?

> `optional` **duration?**: `number`

Duration (for end events)

---

### score?

> `optional` **score?**: `number`

Score result (for end events)

---

### error?

> `optional` **error?**: `string`

Error message (for error events)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Additional metadata
