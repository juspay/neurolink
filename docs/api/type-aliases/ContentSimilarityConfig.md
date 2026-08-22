[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentSimilarityConfig

# Type Alias: ContentSimilarityConfig

> **ContentSimilarityConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/scorer.ts#L476)

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
