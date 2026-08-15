[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedGenerateResult

# Type Alias: EnhancedGenerateResult

> **EnhancedGenerateResult** = [`GenerateResult`](GenerateResult.md) & `object`

Defined in: [types/generate.ts:1680](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1680)

## Type Declaration

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

### ttsMetadata?

> `optional` **ttsMetadata?**: [`TTSMetadata`](TTSMetadata.md)

Outcome metadata when TTS was enabled for this generation.
