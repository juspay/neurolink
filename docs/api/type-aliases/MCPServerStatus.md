[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatus

# Type Alias: MCPServerStatus

> **MCPServerStatus** = `object`

MCP Server Status for CLI Operations - High Reusability

## Properties

### mcpInitialized

> **mcpInitialized**: `boolean`

Whether MCP is initialized

---

### totalServers

> **totalServers**: `number`

Total number of servers

---

### availableServers

> **availableServers**: `number`

Number of available servers

---

### autoDiscoveredCount

> **autoDiscoveredCount**: `number`

Number of auto-discovered servers

---

### totalTools

> **totalTools**: `number`

Total number of tools

---

### customToolsCount

> **customToolsCount**: `number`

Number of custom tools

---

### inMemoryServersCount

> **inMemoryServersCount**: `number`

Number of in-memory servers

---

### error?

> `optional` **error?**: `string`

Error message

---

### autoDiscoveredServers?

> `optional` **autoDiscoveredServers?**: [`MCPDiscoveredServer`](MCPDiscoveredServer.md)[]

Auto-discovered servers from various sources

---

### connectedServers

> **connectedServers**: [`MCPConnectedServer`](MCPConnectedServer.md)[]

Currently connected servers

---

### availableTools

> **availableTools**: [`MCPToolInfo`](MCPToolInfo.md)[]

Available tools across all servers

---

### serverRegistry?

> `optional` **serverRegistry?**: `Record`\<`string`, [`MCPServerInfo`](MCPServerInfo.md)\>

Server registry entries
