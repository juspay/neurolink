[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancementOptions

# Type Alias: EnhancementOptions

> **EnhancementOptions** = `object`

Defined in: [types/utilities.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L141)

Enhancement options for modifying GenerateOptions

## Properties

### enhancementType

> **enhancementType**: [`EnhancementType`](EnhancementType.md)

Defined in: [types/utilities.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L142)

---

### streamingOptions?

> `optional` **streamingOptions?**: `object`

Defined in: [types/utilities.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L143)

#### enabled?

> `optional` **enabled?**: `boolean`

#### chunkSize?

> `optional` **chunkSize?**: `number`

#### bufferSize?

> `optional` **bufferSize?**: `number`

#### enableProgress?

> `optional` **enableProgress?**: `boolean`

#### preferStreaming?

> `optional` **preferStreaming?**: `boolean`

---

### mcpOptions?

> `optional` **mcpOptions?**: `object`

Defined in: [types/utilities.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L150)

#### enableToolRegistry?

> `optional` **enableToolRegistry?**: `boolean`

#### contextAware?

> `optional` **contextAware?**: `boolean`

#### executionContext?

> `optional` **executionContext?**: [`ExecutionContext`](ExecutionContext.md)

---

### legacyMigration?

> `optional` **legacyMigration?**: `object`

Defined in: [types/utilities.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L155)

#### legacyContext?

> `optional` **legacyContext?**: `Record`\<`string`, `unknown`\>

#### domainType?

> `optional` **domainType?**: `string`

#### preserveFields?

> `optional` **preserveFields?**: `boolean`

---

### domainConfiguration?

> `optional` **domainConfiguration?**: `object`

Defined in: [types/utilities.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L160)

#### domainType

> **domainType**: `string`

#### keyTerms?

> `optional` **keyTerms?**: `string`[]

#### failurePatterns?

> `optional` **failurePatterns?**: `string`[]

#### successPatterns?

> `optional` **successPatterns?**: `string`[]

#### evaluationCriteria?

> `optional` **evaluationCriteria?**: `Record`\<`string`, `unknown`\>

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/utilities.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L167)

#### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

#### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

#### timeout?

> `optional` **timeout?**: `number`
