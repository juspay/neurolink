[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientFactory

# Class: MCPClientFactory

Defined in: [mcp/mcpClientFactory.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L60)

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

Defined in: [mcp/mcpClientFactory.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L77)

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

Defined in: [mcp/mcpClientFactory.ts:794](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L794)

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

Defined in: [mcp/mcpClientFactory.ts:865](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L865)

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

Defined in: [mcp/mcpClientFactory.ts:927](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L927)

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

Defined in: [mcp/mcpClientFactory.ts:978](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L978)

Get supported transport types

#### Returns

[`MCPTransportType`](../type-aliases/MCPTransportType.md)[]

---

### getDefaultCapabilities()

> `static` **getDefaultCapabilities**(): `object`

Defined in: [mcp/mcpClientFactory.ts:985](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/mcpClientFactory.ts#L985)

Get default client capabilities

#### Returns

`object`
