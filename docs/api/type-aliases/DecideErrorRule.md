[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideErrorRule

# Type Alias: DecideErrorRule

> **DecideErrorRule** = `object`

## Properties

### status?

> `optional` **status?**: `number` \| readonly `number`[]

One status or a list of them. A rule sets this or `statusMin`, never both.

---

### statusMin?

> `optional` **statusMin?**: `number`

Matches every status at or above this value.

---

### kind

> **kind**: [`DecisionErrorKind`](DecisionErrorKind.md)

---

### retryable?

> `optional` **retryable?**: `boolean`
