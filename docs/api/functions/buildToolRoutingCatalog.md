[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildToolRoutingCatalog

# Function: buildToolRoutingCatalog()

> **buildToolRoutingCatalog**(`servers`, `registeredToolNames`): [`ToolRoutingCatalogEntry`](../type-aliases/ToolRoutingCatalogEntry.md)[]

Defined in: [core/toolRouting.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRouting.ts#L77)

Builds the routing catalog by pairing each declared server with the
registered tool names that belong to it (`${serverId}_${toolName}`).
Servers with zero registered tools are dropped.

## Parameters

### servers

[`ToolRoutingServerDescriptor`](../type-aliases/ToolRoutingServerDescriptor.md)[]

### registeredToolNames

`string`[]

## Returns

[`ToolRoutingCatalogEntry`](../type-aliases/ToolRoutingCatalogEntry.md)[]
