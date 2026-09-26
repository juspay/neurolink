[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientFactory

# Class: MCPClientFactory

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

Get supported transport types

#### Returns

[`MCPTransportType`](../type-aliases/MCPTransportType.md)[]

---

### getDefaultCapabilities()

> `static` **getDefaultCapabilities**(): `object`

Get default client capabilities

#### Returns

`object`
