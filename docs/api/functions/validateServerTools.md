[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateServerTools

# Function: validateServerTools()

> **validateServerTools**(`server`): `Promise`\<\{ `isValid`: `boolean`; `invalidTools`: `string`[]; `errors`: `string`[]; \}\>

Async utility function to validate all tools in a server
Ensures all registered tools follow proper async patterns

## Parameters

### server

[`NeuroLinkMCPServer`](../type-aliases/NeuroLinkMCPServer.md)

## Returns

`Promise`\<\{ `isValid`: `boolean`; `invalidTools`: `string`[]; `errors`: `string`[]; \}\>
