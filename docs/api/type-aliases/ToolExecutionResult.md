[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Defined in: [types/tools.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L220)

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

Defined in: [types/tools.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L221)

---

### context?

> `optional` **context?**: [`ExecutionContext`](ExecutionContext.md)

Defined in: [types/tools.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L222)

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/tools.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L223)

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed?**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### validation?

> `optional` **validation?**: [`ValidationResult`](ValidationResult.md)

Defined in: [types/tools.ts:228](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L228)

---

### cached?

> `optional` **cached?**: `boolean`

Defined in: [types/tools.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L229)

---

### fallback?

> `optional` **fallback?**: `boolean`

Defined in: [types/tools.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L230)
