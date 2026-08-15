[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FormatScorerConfig

# Type Alias: FormatScorerConfig

> **FormatScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:532](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L532)

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
