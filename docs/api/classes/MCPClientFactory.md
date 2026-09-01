[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientFactory

# Class: MCPClientFactory

Defined in: [mcp/mcpClientFactory.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L106)

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

Defined in: [mcp/mcpClientFactory.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L123)

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

### getStderrTail()

> `static` **getStderrTail**(`transport`): `string`[]

Defined in: [mcp/mcpClientFactory.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L366)

The most recent stderr lines written by the stdio server behind
`transport`. Empty for network transports and for servers that have
written nothing. Lines are captured from before the process is even
started, so an early boot failure is included.

#### Parameters

##### transport

`Transport`

#### Returns

`string`[]

---

### closeClient()

> `static` **closeClient**(`client`, `transport`, `process?`): `Promise`\<`void`\>

Defined in: [mcp/mcpClientFactory.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L815)

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

Defined in: [mcp/mcpClientFactory.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L886)

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

Defined in: [mcp/mcpClientFactory.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L948)

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

Defined in: [mcp/mcpClientFactory.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L999)

Get supported transport types

#### Returns

[`MCPTransportType`](../type-aliases/MCPTransportType.md)[]

---

### getDefaultCapabilities()

> `static` **getDefaultCapabilities**(): `object`

Defined in: [mcp/mcpClientFactory.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpClientFactory.ts#L1006)

Get default client capabilities

#### Returns

`object`
