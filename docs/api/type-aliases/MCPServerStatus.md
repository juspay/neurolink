[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatus

# Type Alias: MCPServerStatus

> **MCPServerStatus** = `object`

Defined in: [types/mcp.ts:200](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L200)

MCP Server Status for CLI Operations - High Reusability

## Properties

### mcpInitialized

> **mcpInitialized**: `boolean`

Defined in: [types/mcp.ts:202](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L202)

Whether MCP is initialized

---

### totalServers

> **totalServers**: `number`

Defined in: [types/mcp.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L204)

Total number of servers

---

### availableServers

> **availableServers**: `number`

Defined in: [types/mcp.ts:206](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L206)

Number of available servers

---

### autoDiscoveredCount

> **autoDiscoveredCount**: `number`

Defined in: [types/mcp.ts:208](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L208)

Number of auto-discovered servers

---

### totalTools

> **totalTools**: `number`

Defined in: [types/mcp.ts:210](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L210)

Total number of tools

---

### customToolsCount

> **customToolsCount**: `number`

Defined in: [types/mcp.ts:212](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L212)

Number of custom tools

---

### inMemoryServersCount

> **inMemoryServersCount**: `number`

Defined in: [types/mcp.ts:214](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L214)

Number of in-memory servers

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:216](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L216)

Error message

---

### autoDiscoveredServers?

> `optional` **autoDiscoveredServers?**: [`MCPDiscoveredServer`](MCPDiscoveredServer.md)[]

Defined in: [types/mcp.ts:218](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L218)

Auto-discovered servers from various sources

---

### connectedServers

> **connectedServers**: [`MCPConnectedServer`](MCPConnectedServer.md)[]

Defined in: [types/mcp.ts:220](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L220)

Currently connected servers

---

### availableTools

> **availableTools**: [`MCPToolInfo`](MCPToolInfo.md)[]

Defined in: [types/mcp.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L222)

Available tools across all servers

---

### serverRegistry?

> `optional` **serverRegistry?**: `Record`\<`string`, [`MCPServerInfo`](MCPServerInfo.md)\>

Defined in: [types/mcp.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L224)

Server registry entries
