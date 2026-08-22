[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiscoveredMcp

# Type Alias: DiscoveredMcp\<TTools\>

> **DiscoveredMcp**\<`TTools`\> = `object`

Defined in: [types/mcp.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L528)

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

Defined in: [types/mcp.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L529)

---

### tools?

> `optional` **tools?**: `TTools`

Defined in: [types/mcp.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L530)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/mcp.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L531)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L532)

---

### configuration?

> `optional` **configuration?**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/mcp.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L533)
