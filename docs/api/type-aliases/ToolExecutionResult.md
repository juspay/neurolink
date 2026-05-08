[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Defined in: [types/tools.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L192)

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

Defined in: [types/tools.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L193)

---

### context?

> `optional` **context?**: [`ExecutionContext`](ExecutionContext.md)

Defined in: [types/tools.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L194)

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/tools.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L195)

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed?**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### validation?

> `optional` **validation?**: [`ValidationResult`](ValidationResult.md)

Defined in: [types/tools.ts:200](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L200)

---

### cached?

> `optional` **cached?**: `boolean`

Defined in: [types/tools.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L201)

---

### fallback?

> `optional` **fallback?**: `boolean`

Defined in: [types/tools.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L202)
