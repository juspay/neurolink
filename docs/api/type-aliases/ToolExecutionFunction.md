[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionFunction

# Type Alias: ToolExecutionFunction\<TParams, TResult\>

> **ToolExecutionFunction**\<`TParams`, `TResult`\> = (`params`, `context?`) => `Promise`\<`TResult`\>

Defined in: [types/aliases.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/aliases.ts#L97)

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
