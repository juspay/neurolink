[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatus

# Type Alias: MCPServerStatus

> **MCPServerStatus** = `object`

Defined in: [types/mcp.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L219)

MCP Server Status for CLI Operations - High Reusability

## Properties

### mcpInitialized

> **mcpInitialized**: `boolean`

Defined in: [types/mcp.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L221)

Whether MCP is initialized

---

### totalServers

> **totalServers**: `number`

Defined in: [types/mcp.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L223)

Total number of servers

---

### availableServers

> **availableServers**: `number`

Defined in: [types/mcp.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L225)

Number of available servers

---

### autoDiscoveredCount

> **autoDiscoveredCount**: `number`

Defined in: [types/mcp.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L227)

Number of auto-discovered servers

---

### totalTools

> **totalTools**: `number`

Defined in: [types/mcp.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L229)

Total number of tools

---

### customToolsCount

> **customToolsCount**: `number`

Defined in: [types/mcp.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L231)

Number of custom tools

---

### inMemoryServersCount

> **inMemoryServersCount**: `number`

Defined in: [types/mcp.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L233)

Number of in-memory servers

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L235)

Error message

---

### autoDiscoveredServers?

> `optional` **autoDiscoveredServers?**: [`MCPDiscoveredServer`](MCPDiscoveredServer.md)[]

Defined in: [types/mcp.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L237)

Auto-discovered servers from various sources

---

### connectedServers

> **connectedServers**: [`MCPConnectedServer`](MCPConnectedServer.md)[]

Defined in: [types/mcp.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L239)

Currently connected servers

---

### availableTools

> **availableTools**: [`MCPToolInfo`](MCPToolInfo.md)[]

Defined in: [types/mcp.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L241)

Available tools across all servers

---

### serverRegistry?

> `optional` **serverRegistry?**: `Record`\<`string`, [`MCPServerInfo`](MCPServerInfo.md)\>

Defined in: [types/mcp.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L243)

Server registry entries
