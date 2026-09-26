[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpan

# Type Alias: LangfuseSpan

> **LangfuseSpan** = `object`

Langfuse-specific span format

## Properties

### id

> **id**: `string`

---

### traceId

> **traceId**: `string`

---

### parentObservationId?

> `optional` **parentObservationId?**: `string`

---

### name

> **name**: `string`

---

### startTime

> **startTime**: `string`

---

### endTime?

> `optional` **endTime?**: `string`

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

---

### level

> **level**: `"DEBUG"` \| `"DEFAULT"` \| `"WARNING"` \| `"ERROR"`

---

### statusMessage?

> `optional` **statusMessage?**: `string`

---

### input?

> `optional` **input?**: `unknown`

---

### output?

> `optional` **output?**: `unknown`

---

### usage?

> `optional` **usage?**: `object`

#### promptTokens?

> `optional` **promptTokens?**: `number`

#### completionTokens?

> `optional` **completionTokens?**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`
