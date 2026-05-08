[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getServerInfo

# Function: getServerInfo()

> **getServerInfo**(`server`): `object`

Defined in: [mcp/factory.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/factory.ts#L156)

Utility function to get server info

## Parameters

### server

[`NeuroLinkMCPServer`](../type-aliases/NeuroLinkMCPServer.md)

## Returns

`object`

### id

> **id**: `string`

### title

> **title**: `string`

### description?

> `optional` **description?**: `string`

### category?

> `optional` **category?**: [`MCPServerDomainCategory`](../type-aliases/MCPServerDomainCategory.md)

### toolCount

> **toolCount**: `number`

### capabilities

> **capabilities**: `string`[]
