[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkTokenUsage

# Type Alias: NetworkTokenUsage

> **NetworkTokenUsage** = `object`

Token usage aggregated across the network

## Properties

### promptTokens

> **promptTokens**: `number`

Total prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Total completion tokens

---

### totalTokens

> **totalTokens**: `number`

Total tokens

---

### byAgent?

> `optional` **byAgent?**: `Record`\<`string`, \{ `promptTokens`: `number`; `completionTokens`: `number`; `totalTokens`: `number`; \}\>

Breakdown by agent
