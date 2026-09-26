[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

---

### context?

> `optional` **context?**: [`ExecutionContext`](ExecutionContext.md)

---

### performance?

> `optional` **performance?**: `object`

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed?**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### validation?

> `optional` **validation?**: [`ValidationResult`](ValidationResult.md)

---

### cached?

> `optional` **cached?**: `boolean`

---

### fallback?

> `optional` **fallback?**: `boolean`
