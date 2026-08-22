[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateServerTools

# Function: validateServerTools()

> **validateServerTools**(`server`): `Promise`\<\{ `isValid`: `boolean`; `invalidTools`: `string`[]; `errors`: `string`[]; \}\>

Defined in: [mcp/factory.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/factory.ts#L178)

Async utility function to validate all tools in a server
Ensures all registered tools follow proper async patterns

## Parameters

### server

[`NeuroLinkMCPServer`](../type-aliases/NeuroLinkMCPServer.md)

## Returns

`Promise`\<\{ `isValid`: `boolean`; `invalidTools`: `string`[]; `errors`: `string`[]; \}\>
