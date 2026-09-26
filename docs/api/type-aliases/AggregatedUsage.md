[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedUsage

# Type Alias: AggregatedUsage

> **AggregatedUsage** = `object`

Aggregated token usage across all models

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

### byModel

> **byModel**: `object`[]

#### provider

> **provider**: `string`

#### model

> **model**: `string`

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### judgeUsage?

> `optional` **judgeUsage?**: `object`

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

#### cost?

> `optional` **cost?**: `number`
