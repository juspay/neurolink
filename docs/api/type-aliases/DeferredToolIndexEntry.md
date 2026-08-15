[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeferredToolIndexEntry

# Type Alias: DeferredToolIndexEntry

> **DeferredToolIndexEntry** = `object`

Defined in: [types/toolResolution.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L72)

One entry in the deferred-tool catalog embedded in the `search_tools`
meta-tool description when `tools.discovery` is enabled.

## Properties

### name

> **name**: `string`

Defined in: [types/toolResolution.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L73)

---

### summary

> **summary**: `string`

Defined in: [types/toolResolution.ts:75](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L75)

One-line description (truncated) shown in the search_tools catalog.

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/toolResolution.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolResolution.ts#L77)

Originating MCP server id, when known.
