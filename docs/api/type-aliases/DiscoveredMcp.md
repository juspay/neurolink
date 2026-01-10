[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiscoveredMcp

# Type Alias: DiscoveredMcp\<TTools\>

> **DiscoveredMcp**\<`TTools`\> = `object`

Defined in: [types/mcpTypes.ts:516](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L516)

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

Defined in: [types/mcpTypes.ts:517](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L517)

---

### tools?

> `optional` **tools**: `TTools`

Defined in: [types/mcpTypes.ts:518](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L518)

---

### capabilities?

> `optional` **capabilities**: `string`[]

Defined in: [types/mcpTypes.ts:519](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L519)

---

### version?

> `optional` **version**: `string`

Defined in: [types/mcpTypes.ts:520](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L520)

---

### configuration?

> `optional` **configuration**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/mcpTypes.ts:521](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L521)
