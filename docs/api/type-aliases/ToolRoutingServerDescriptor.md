[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingServerDescriptor

# Type Alias: ToolRoutingServerDescriptor

> **ToolRoutingServerDescriptor** = `object`

Defined in: [types/toolRouting.ts:22](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L22)

One routable server as declared by the host application.

## Properties

### id

> **id**: `string`

Defined in: [types/toolRouting.ts:27](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L27)

Server id. Must be the prefix used when the host registered the server's
tools (`${id}_${toolName}`) — tool names are grouped by this prefix.

---

### description

> **description**: `string`

Defined in: [types/toolRouting.ts:29](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L29)

Routing-grade server description shown to the router LLM.
