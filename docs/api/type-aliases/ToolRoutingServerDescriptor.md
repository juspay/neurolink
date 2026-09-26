[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingServerDescriptor

# Type Alias: ToolRoutingServerDescriptor

> **ToolRoutingServerDescriptor** = `object`

One routable server as declared by the host application.

## Properties

### id

> **id**: `string`

Server id. Must be the prefix used when the host registered the server's
tools (`${id}_${toolName}`) — tool names are grouped by this prefix.

---

### description

> **description**: `string`

Routing-grade server description shown to the router LLM.
