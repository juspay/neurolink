[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SDKToolContext

# Type Alias: SDKToolContext

> **SDKToolContext** = [`ToolContext`](ToolContext.md) & `object`

Defined in: [types/tools.ts:257](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L257)

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
