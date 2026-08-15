[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LLMScorerConfig

# Type Alias: LLMScorerConfig

> **LLMScorerConfig** = [`ScorerConfig`](ScorerConfig.md) & `object`

Defined in: [types/scorer.ts:165](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L165)

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
