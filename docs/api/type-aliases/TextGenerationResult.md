[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generateTypes.ts:611](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L611)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generateTypes.ts:612](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L612)

---

### provider?

> `optional` **provider**: `string`

Defined in: [types/generateTypes.ts:613](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L613)

---

### model?

> `optional` **model**: `string`

Defined in: [types/generateTypes.ts:614](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L614)

---

### usage?

> `optional` **usage**: `TokenUsage`

Defined in: [types/generateTypes.ts:615](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L615)

---

### responseTime?

> `optional` **responseTime**: `number`

Defined in: [types/generateTypes.ts:616](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L616)

---

### toolsUsed?

> `optional` **toolsUsed**: `string`[]

Defined in: [types/generateTypes.ts:617](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L617)

---

### toolExecutions?

> `optional` **toolExecutions**: `object`[]

Defined in: [types/generateTypes.ts:618](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L618)

#### toolName

> **toolName**: `string`

#### executionTime

> **executionTime**: `number`

#### success

> **success**: `boolean`

#### serverId?

> `optional` **serverId**: `string`

---

### enhancedWithTools?

> `optional` **enhancedWithTools**: `boolean`

Defined in: [types/generateTypes.ts:624](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L624)

---

### availableTools?

> `optional` **availableTools**: `object`[]

Defined in: [types/generateTypes.ts:625](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L625)

#### name

> **name**: `string`

#### description

> **description**: `string`

#### server

> **server**: `string`

#### category?

> `optional` **category**: `string`

---

### analytics?

> `optional` **analytics**: [`AnalyticsData`](AnalyticsData.md)

Defined in: [types/generateTypes.ts:632](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L632)

---

### evaluation?

> `optional` **evaluation**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generateTypes.ts:633](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L633)

---

### audio?

> `optional` **audio**: `TTSResult`

Defined in: [types/generateTypes.ts:634](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L634)
