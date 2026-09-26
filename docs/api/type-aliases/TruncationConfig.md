[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TruncationConfig

# Type Alias: TruncationConfig

> **TruncationConfig** = `object`

Configuration for sliding window truncation (Stage 4).

## Properties

### fraction?

> `optional` **fraction?**: `number`

---

### currentTokens?

> `optional` **currentTokens?**: `number`

Current estimated tokens (enables adaptive mode)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Target token budget (enables adaptive mode)

---

### provider?

> `optional` **provider?**: `string`

Provider for token estimation (enables adaptive mode)

---

### adaptiveBuffer?

> `optional` **adaptiveBuffer?**: `number`

Buffer above required reduction (default: 0.15 = 15%)

---

### maxIterations?

> `optional` **maxIterations?**: `number`

Maximum iterations for adaptive truncation (default: 3)
