[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Defined in: [types/tools.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L209)

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

Defined in: [types/tools.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L210)

---

### context?

> `optional` **context?**: [`ExecutionContext`](ExecutionContext.md)

Defined in: [types/tools.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L211)

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/tools.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L212)

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed?**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### validation?

> `optional` **validation?**: [`ValidationResult`](ValidationResult.md)

Defined in: [types/tools.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L217)

---

### cached?

> `optional` **cached?**: `boolean`

Defined in: [types/tools.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L218)

---

### fallback?

> `optional` **fallback?**: `boolean`

Defined in: [types/tools.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L219)
