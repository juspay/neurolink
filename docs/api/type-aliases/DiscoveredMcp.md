[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / DiscoveredMcp

# Type Alias: DiscoveredMcp\<TTools\>

> **DiscoveredMcp**\<`TTools`\> = `object`

Defined in: [types/mcpTypes.ts:472](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L472)

Discovered MCP server/plugin definition
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### TTools

`TTools` = `StandardRecord`

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### metadata

> **metadata**: [`McpMetadata`](McpMetadata.md)

Defined in: [types/mcpTypes.ts:473](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L473)

---

### tools?

> `optional` **tools**: `TTools`

Defined in: [types/mcpTypes.ts:474](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L474)

---

### capabilities?

> `optional` **capabilities**: `string`[]

Defined in: [types/mcpTypes.ts:475](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L475)

---

### version?

> `optional` **version**: `string`

Defined in: [types/mcpTypes.ts:476](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L476)

---

### configuration?

> `optional` **configuration**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/mcpTypes.ts:477](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L477)
