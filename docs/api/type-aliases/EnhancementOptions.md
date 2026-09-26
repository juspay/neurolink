[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancementOptions

# Type Alias: EnhancementOptions

> **EnhancementOptions** = `object`

Enhancement options for modifying GenerateOptions

## Properties

### enhancementType

> **enhancementType**: [`EnhancementType`](EnhancementType.md)

---

### streamingOptions?

> `optional` **streamingOptions?**: `object`

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

#### enableToolRegistry?

> `optional` **enableToolRegistry?**: `boolean`

#### contextAware?

> `optional` **contextAware?**: `boolean`

#### executionContext?

> `optional` **executionContext?**: [`ExecutionContext`](ExecutionContext.md)

---

### legacyMigration?

> `optional` **legacyMigration?**: `object`

#### legacyContext?

> `optional` **legacyContext?**: `Record`\<`string`, `unknown`\>

#### domainType?

> `optional` **domainType?**: `string`

#### preserveFields?

> `optional` **preserveFields?**: `boolean`

---

### domainConfiguration?

> `optional` **domainConfiguration?**: `object`

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

#### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

#### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

#### timeout?

> `optional` **timeout?**: `number`
