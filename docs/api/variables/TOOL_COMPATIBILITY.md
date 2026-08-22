[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TOOL_COMPATIBILITY

# Variable: TOOL_COMPATIBILITY

> `const` **TOOL_COMPATIBILITY**: `object`

Defined in: [mcp/toolConverter.ts:338](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/toolConverter.ts#L338)

Tool compatibility matrix

## Type Declaration

### MCP_2024_11_05

> `readonly` **MCP_2024_11_05**: `object`

Features supported by MCP 2024-11-05 specification

#### MCP_2024_11_05.annotations

> `readonly` **annotations**: `true` = `true`

#### MCP_2024_11_05.inputSchema

> `readonly` **inputSchema**: `true` = `true`

#### MCP_2024_11_05.outputSchema

> `readonly` **outputSchema**: `false` = `false`

#### MCP_2024_11_05.streamingResults

> `readonly` **streamingResults**: `false` = `false`

#### MCP_2024_11_05.batchExecution

> `readonly` **batchExecution**: `false` = `false`

### NEUROLINK

> `readonly` **NEUROLINK**: `object`

Features supported by NeuroLink

#### NEUROLINK.annotations

> `readonly` **annotations**: `true` = `true`

#### NEUROLINK.inputSchema

> `readonly` **inputSchema**: `true` = `true`

#### NEUROLINK.outputSchema

> `readonly` **outputSchema**: `true` = `true`

#### NEUROLINK.streamingResults

> `readonly` **streamingResults**: `true` = `true`

#### NEUROLINK.batchExecution

> `readonly` **batchExecution**: `true` = `true`

#### NEUROLINK.categories

> `readonly` **categories**: `true` = `true`

#### NEUROLINK.tags

> `readonly` **tags**: `true` = `true`
