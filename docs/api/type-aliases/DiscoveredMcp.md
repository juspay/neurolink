[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiscoveredMcp

# Type Alias: DiscoveredMcp\<TTools\>

> **DiscoveredMcp**\<`TTools`\> = `object`

Defined in: [types/mcp.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L547)

Discovered MCP server/plugin definition
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### TTools

`TTools` = [`StandardRecord`](StandardRecord.md)

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### metadata

> **metadata**: [`McpMetadata`](McpMetadata.md)

Defined in: [types/mcp.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L548)

---

### tools?

> `optional` **tools?**: `TTools`

Defined in: [types/mcp.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L549)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/mcp.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L550)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L551)

---

### configuration?

> `optional` **configuration?**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/mcp.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L552)
