[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentSimilarityConfig

# Type Alias: ContentSimilarityConfig

> **ContentSimilarityConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:476](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L476)

Configuration specific to content similarity scoring.

## Type Declaration

### metric?

> `optional` **metric?**: [`SimilarityMetric`](SimilarityMetric.md)

### metrics?

> `optional` **metrics?**: [`SimilarityMetric`](SimilarityMetric.md)[]

### metricCombination?

> `optional` **metricCombination?**: `"average"` \| `"min"` \| `"max"` \| `"weighted"`

### metricWeights?

> `optional` **metricWeights?**: `Record`\<[`SimilarityMetric`](SimilarityMetric.md), `number`\>

### normalizeText?

> `optional` **normalizeText?**: `boolean`

### tokenLevel?

> `optional` **tokenLevel?**: `"word"` \| `"character"` \| `"ngram"`

### ngramSize?

> `optional` **ngramSize?**: `number`

### compareWith?

> `optional` **compareWith?**: `"groundTruth"` \| `"context"` \| `"custom"`

### referenceText?

> `optional` **referenceText?**: `string`
