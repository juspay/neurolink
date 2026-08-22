[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KeywordCoverageConfig

# Type Alias: KeywordCoverageConfig

> **KeywordCoverageConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/scorer.ts#L567)

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
