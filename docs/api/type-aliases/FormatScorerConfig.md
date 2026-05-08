[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FormatScorerConfig

# Type Alias: FormatScorerConfig

> **FormatScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L532)

Configuration specific to format scoring.

## Type Declaration

### expectedFormat?

> `optional` **expectedFormat?**: [`FormatType`](FormatType.md)

### allowedFormats?

> `optional` **allowedFormats?**: [`FormatType`](FormatType.md)[]

### codeLanguage?

> `optional` **codeLanguage?**: [`CodeLanguage`](CodeLanguage.md)

### jsonSchema?

> `optional` **jsonSchema?**: `object`

### markdownRequirements?

> `optional` **markdownRequirements?**: `object`

#### markdownRequirements.hasHeadings?

> `optional` **hasHeadings?**: `boolean`

#### markdownRequirements.hasCodeBlocks?

> `optional` **hasCodeBlocks?**: `boolean`

#### markdownRequirements.hasLinks?

> `optional` **hasLinks?**: `boolean`

#### markdownRequirements.hasLists?

> `optional` **hasLists?**: `boolean`

#### markdownRequirements.minHeadingLevel?

> `optional` **minHeadingLevel?**: `number`

#### markdownRequirements.maxHeadingLevel?

> `optional` **maxHeadingLevel?**: `number`

### listRequirements?

> `optional` **listRequirements?**: `object`

#### listRequirements.minItems?

> `optional` **minItems?**: `number`

#### listRequirements.maxItems?

> `optional` **maxItems?**: `number`

#### listRequirements.itemPattern?

> `optional` **itemPattern?**: `string`

### customPattern?

> `optional` **customPattern?**: `string`

### strictFormat?

> `optional` **strictFormat?**: `boolean`
