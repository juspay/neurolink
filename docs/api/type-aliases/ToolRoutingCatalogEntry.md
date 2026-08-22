[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCatalogEntry

# Type Alias: ToolRoutingCatalogEntry

> **ToolRoutingCatalogEntry** = `object`

Defined in: [types/toolRouting.ts:183](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L183)

Catalog entry pairing a server descriptor with its registered tool names.

## Properties

### id

> **id**: `string`

Defined in: [types/toolRouting.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L184)

---

### description

> **description**: `string`

Defined in: [types/toolRouting.ts:185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L185)

---

### toolNames

> **toolNames**: `string`[]

Defined in: [types/toolRouting.ts:187](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L187)

Registered tool names for this server, i.e. `${serverId}_${toolName}`.
