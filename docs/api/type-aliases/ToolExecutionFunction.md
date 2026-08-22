[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionFunction

# Type Alias: ToolExecutionFunction\<TParams, TResult\>

> **ToolExecutionFunction**\<`TParams`, `TResult`\> = (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/aliases.ts:111](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/aliases.ts#L111)

Tool execution function with context
Standard pattern for MCP tool execution

## Type Parameters

### TParams

`TParams` = `unknown`

### TResult

`TResult` = `unknown`

## Parameters

### params

`TParams`

### context?

[`StandardRecord`](StandardRecord.md)

## Returns

`Promise`\<`TResult`\>
