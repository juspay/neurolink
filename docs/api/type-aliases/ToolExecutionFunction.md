[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionFunction

# Type Alias: ToolExecutionFunction\<TParams, TResult\>

> **ToolExecutionFunction**\<`TParams`, `TResult`\> = (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/aliases.ts:111](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/aliases.ts#L111)

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
