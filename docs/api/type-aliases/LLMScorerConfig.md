[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMScorerConfig

# Type Alias: LLMScorerConfig

> **LLMScorerConfig** = [`ScorerConfig`](ScorerConfig.md) & `object`

Defined in: [types/scorer.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/scorer.ts#L165)

LLM-based scorer configuration

## Type Declaration

### model?

> `optional` **model?**: `string`

Model to use for scoring

### provider?

> `optional` **provider?**: `string`

Provider for the scoring model

### temperature?

> `optional` **temperature?**: `number`

Temperature for LLM scoring

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Custom prompt template

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Output schema for structured scoring
