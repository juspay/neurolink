[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGenerateResult

# Type Alias: EnhancedGenerateResult

> **EnhancedGenerateResult** = [`GenerateResult`](GenerateResult.md) & `object`

Defined in: [types/generate.ts:1687](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L1687)

## Type Declaration

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

### ttsMetadata?

> `optional` **ttsMetadata?**: [`TTSMetadata`](TTSMetadata.md)

Outcome metadata when TTS was enabled for this generation.
