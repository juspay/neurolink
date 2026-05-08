[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SDKToolContext

# Type Alias: SDKToolContext

> **SDKToolContext** = [`ToolContext`](ToolContext.md) & `object`

Defined in: [types/tools.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L240)

SDK-specific tool context with additional fields for SDK usage
Extends the base ToolContext with session management, provider info, and logging

## Type Declaration

### sessionId

> **sessionId**: `string`

Current session ID (required for SDK context)

### provider?

> `optional` **provider?**: `string`

AI provider being used

### model?

> `optional` **model?**: `string`

Model being used

### callTool?

> `optional` **callTool?**: (`name`, `params`) => `Promise`\<[`ToolResult`](ToolResult.md)\>

Call another tool

#### Parameters

##### name

`string`

##### params

[`ToolArgs`](ToolArgs.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\>

### logger

> **logger**: [`Logger`](Logger.md)

Logger instance
