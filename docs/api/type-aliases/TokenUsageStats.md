[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenUsageStats

# Type Alias: TokenUsageStats

> **TokenUsageStats** = `object`

Aggregated token usage statistics

## Properties

### totalInputTokens

> **totalInputTokens**: `number`

---

### totalOutputTokens

> **totalOutputTokens**: `number`

---

### totalTokens

> **totalTokens**: `number`

---

### cacheReadTokens

> **cacheReadTokens**: `number`

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

---

### reasoningTokens

> **reasoningTokens**: `number`

---

### totalCost

> **totalCost**: `number`

---

### byProvider

> **byProvider**: `Map`\<`string`, [`ProviderTokenStats`](ProviderTokenStats.md)\>

---

### byModel

> **byModel**: `Map`\<`string`, [`ModelTokenStats`](ModelTokenStats.md)\>

---

### bySpanType

> **bySpanType**: `Map`\<`string`, `number`\>
