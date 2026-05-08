[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPCommandArgs

# Type Alias: MCPCommandArgs

> **MCPCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L179)

MCP command arguments - Enhanced with transport and server management

## Type Declaration

### server?

> `optional` **server?**: `string`

MCP server name

### serverName?

> `optional` **serverName?**: `string`

MCP server name (alias for server)

### tool?

> `optional` **tool?**: `string`

Tool name to execute

### params?

> `optional` **params?**: `string`

Tool parameters as JSON string

### list?

> `optional` **list?**: `boolean`

List available tools

### listOnly?

> `optional` **listOnly?**: `boolean`

List only specific category

### discover?

> `optional` **discover?**: `boolean`

Discover MCP servers

### info?

> `optional` **info?**: `boolean`

Show server information

### transport?

> `optional` **transport?**: `"stdio"` \| `"websocket"` \| `"tcp"` \| `"unix"`

Transport type for server connection

### description?

> `optional` **description?**: `string`

Server description

### command?

> `optional` **command?**: `string`

Command/executable for stdio transport

### args?

> `optional` **args?**: `string`[]

Arguments for server command

### env?

> `optional` **env?**: `string`

Environment variables for server (JSON string)

### url?

> `optional` **url?**: `string`

Server URL for network transports

### name?

> `optional` **name?**: `string`

Server name for add command

### detailed?

> `optional` **detailed?**: `boolean`

Show detailed information

### force?

> `optional` **force?**: `boolean`

Force operation without confirmation

### autoInstall?

> `optional` **autoInstall?**: `boolean`

Auto install discovered servers

### source?

> `optional` **source?**: `string`

Discovery source

### timeout?

> `optional` **timeout?**: `number`

Connection timeout
