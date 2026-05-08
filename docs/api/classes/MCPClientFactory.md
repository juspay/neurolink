[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientFactory

# Class: MCPClientFactory

Defined in: [mcp/mcpClientFactory.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L60)

MCPClientFactory
Factory class for creating MCP clients with different transports

## Constructors

### Constructor

> **new MCPClientFactory**(): `MCPClientFactory`

#### Returns

`MCPClientFactory`

## Methods

### createClient()

> `static` **createClient**(`config`, `timeout?`): `Promise`\<[`MCPClientResult`](../type-aliases/MCPClientResult.md)\>

Defined in: [mcp/mcpClientFactory.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L77)

Create an MCP client for the given server configuration
Enhanced with retry logic, rate limiting, and circuit breaker protection

#### Parameters

##### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

##### timeout?

`number` = `DEFAULT_CLIENT_TIMEOUT`

#### Returns

`Promise`\<[`MCPClientResult`](../type-aliases/MCPClientResult.md)\>

---

### closeClient()

> `static` **closeClient**(`client`, `transport`, `process?`): `Promise`\<`void`\>

Defined in: [mcp/mcpClientFactory.ts:790](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L790)

Close an MCP client and clean up resources

#### Parameters

##### client

`Client`

##### transport

`Transport`

##### process?

`ChildProcess`

#### Returns

`Promise`\<`void`\>

---

### testConnection()

> `static` **testConnection**(`config`, `timeout?`): `Promise`\<\{ `success`: `boolean`; `error?`: `string`; `capabilities?`: \{ \}; \}\>

Defined in: [mcp/mcpClientFactory.ts:861](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L861)

Test connection to an MCP server

#### Parameters

##### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

##### timeout?

`number` = `5000`

#### Returns

`Promise`\<\{ `success`: `boolean`; `error?`: `string`; `capabilities?`: \{ \}; \}\>

---

### validateClientConfig()

> `static` **validateClientConfig**(`config`): `object`

Defined in: [mcp/mcpClientFactory.ts:923](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L923)

Validate MCP server configuration for client creation

#### Parameters

##### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

`object`

##### isValid

> **isValid**: `boolean`

##### errors

> **errors**: `string`[]

---

### getSupportedTransports()

> `static` **getSupportedTransports**(): [`MCPTransportType`](../type-aliases/MCPTransportType.md)[]

Defined in: [mcp/mcpClientFactory.ts:974](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L974)

Get supported transport types

#### Returns

[`MCPTransportType`](../type-aliases/MCPTransportType.md)[]

---

### getDefaultCapabilities()

> `static` **getDefaultCapabilities**(): `object`

Defined in: [mcp/mcpClientFactory.ts:981](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpClientFactory.ts#L981)

Get default client capabilities

#### Returns

`object`
