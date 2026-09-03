[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Defined in: [types/tools.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L243)

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

Defined in: [types/tools.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L244)

---

### context?

> `optional` **context?**: [`ExecutionContext`](ExecutionContext.md)

Defined in: [types/tools.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L245)

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/tools.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L246)

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed?**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### validation?

> `optional` **validation?**: [`ValidationResult`](ValidationResult.md)

Defined in: [types/tools.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L251)

---

### cached?

> `optional` **cached?**: `boolean`

Defined in: [types/tools.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L252)

---

### fallback?

> `optional` **fallback?**: `boolean`

Defined in: [types/tools.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L253)
