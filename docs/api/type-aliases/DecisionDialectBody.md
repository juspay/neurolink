[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionDialectBody

# Type Alias: DecisionDialectBody

> **DecisionDialectBody** = `object`

What a dialect lays out as one request body.

## Properties

### state

> `readonly` **state**: [`DecisionState`](DecisionState.md)

---

### questions

> `readonly` **questions**: `Readonly`\<`Record`\<`string`, `Record`\<`string`, `unknown`\>\>\>

Each question already written by the dialect's `encodeQuestion`, by id.

---

### model?

> `readonly` `optional` **model?**: `string`

Undefined means the request names no model.

---

### media?

> `readonly` `optional` **media?**: [`DecisionPreparedMedia`](DecisionPreparedMedia.md)

---

### mediaKeys?

> `readonly` `optional` **mediaKeys?**: `Readonly`\<[`DecideMedia`](DecideMedia.md)\>

Where a layout with named media fields puts them; other layouts ignore it.
