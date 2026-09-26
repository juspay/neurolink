[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnsembleResponse

# Type Alias: EnsembleResponse

> **EnsembleResponse** = `object`

Single ensemble model response

## Properties

### provider

> **provider**: `string`

---

### model

> **model**: `string`

---

### modelLabel?

> `optional` **modelLabel?**: `string`

---

### content

> **content**: `string`

---

### responseTime

> **responseTime**: `number`

---

### usage?

> `optional` **usage?**: `object`

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### status

> **status**: `"success"` \| `"failure"` \| `"timeout"` \| `"partial"`

---

### error?

> `optional` **error?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### timestamp

> **timestamp**: `string`
