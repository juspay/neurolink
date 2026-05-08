[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContentSimilarityConfig

# Type Alias: ContentSimilarityConfig

> **ContentSimilarityConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L476)

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
