[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionResult

# Type Alias: ToolExecutionResult\<T\>

> **ToolExecutionResult**\<`T`\> = `object`

Defined in: [types/tools.ts:140](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L140)

Tool execution result
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = `unknown`

## Properties

### result

> **result**: `T`

Defined in: [types/tools.ts:141](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L141)

---

### context?

> `optional` **context**: [`ExecutionContext`](ExecutionContext.md)

Defined in: [types/tools.ts:142](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L142)

---

### performance?

> `optional` **performance**: `object`

Defined in: [types/tools.ts:143](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L143)

#### duration

> **duration**: `number`

#### tokensUsed?

> `optional` **tokensUsed**: `number`

#### cost?

> `optional` **cost**: `number`

---

### validation?

> `optional` **validation**: `ValidationResult`

Defined in: [types/tools.ts:148](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L148)

---

### cached?

> `optional` **cached**: `boolean`

Defined in: [types/tools.ts:149](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L149)

---

### fallback?

> `optional` **fallback**: `boolean`

Defined in: [types/tools.ts:150](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L150)
