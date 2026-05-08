[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancementOptions

# Type Alias: EnhancementOptions

> **EnhancementOptions** = `object`

Defined in: [types/utilities.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L127)

Enhancement options for modifying GenerateOptions

## Properties

### enhancementType

> **enhancementType**: [`EnhancementType`](EnhancementType.md)

Defined in: [types/utilities.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L128)

---

### streamingOptions?

> `optional` **streamingOptions?**: `object`

Defined in: [types/utilities.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L129)

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

Defined in: [types/utilities.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L136)

#### enableToolRegistry?

> `optional` **enableToolRegistry?**: `boolean`

#### contextAware?

> `optional` **contextAware?**: `boolean`

#### executionContext?

> `optional` **executionContext?**: [`ExecutionContext`](ExecutionContext.md)

---

### legacyMigration?

> `optional` **legacyMigration?**: `object`

Defined in: [types/utilities.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L141)

#### legacyContext?

> `optional` **legacyContext?**: `Record`\<`string`, `unknown`\>

#### domainType?

> `optional` **domainType?**: `string`

#### preserveFields?

> `optional` **preserveFields?**: `boolean`

---

### domainConfiguration?

> `optional` **domainConfiguration?**: `object`

Defined in: [types/utilities.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L146)

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

Defined in: [types/utilities.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L153)

#### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

#### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

#### timeout?

> `optional` **timeout?**: `number`
