[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / KeywordCoverageConfig

# Type Alias: KeywordCoverageConfig

> **KeywordCoverageConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:567](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L567)

Configuration specific to keyword coverage scoring.

## Type Declaration

### keywords?

> `optional` **keywords?**: `string`[]

### minCoverage?

> `optional` **minCoverage?**: `number`

### caseInsensitive?

> `optional` **caseInsensitive?**: `boolean`

### wordBoundary?

> `optional` **wordBoundary?**: `boolean`

### synonyms?

> `optional` **synonyms?**: `Record`\<`string`, `string`[]\>

### keywordWeights?

> `optional` **keywordWeights?**: `Record`\<`string`, `number`\>
