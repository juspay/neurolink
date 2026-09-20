[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCatalogEntry

# Type Alias: ToolRoutingCatalogEntry

> **ToolRoutingCatalogEntry** = `object`

Defined in: [types/toolRouting.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L195)

Catalog entry pairing a server descriptor with its registered tool names.

## Properties

### id

> **id**: `string`

Defined in: [types/toolRouting.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L196)

---

### description

> **description**: `string`

Defined in: [types/toolRouting.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L197)

---

### toolNames

> **toolNames**: `string`[]

Defined in: [types/toolRouting.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L199)

Registered tool names for this server, i.e. `${serverId}_${toolName}`.
