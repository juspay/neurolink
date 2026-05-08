[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryTokenStorage

# Class: InMemoryTokenStorage

Defined in: [mcp/auth/tokenStorage.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L14)

In-memory token storage implementation
Suitable for development and single-session use
Tokens are lost when the process terminates

## Implements

- [`TokenStorage`](../type-aliases/TokenStorage.md)

## Constructors

### Constructor

> **new InMemoryTokenStorage**(): `InMemoryTokenStorage`

#### Returns

`InMemoryTokenStorage`

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [mcp/auth/tokenStorage.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L40)

Get the number of stored token sets

##### Returns

`number`

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

Defined in: [mcp/auth/tokenStorage.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L17)

Get stored tokens for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

#### Returns

`Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

Stored tokens or null if not found

#### Implementation of

`TokenStorage.getTokens`

---

### saveTokens()

> **saveTokens**(`serverId`, `tokens`): `Promise`\<`void`\>

Defined in: [mcp/auth/tokenStorage.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L21)

Save tokens for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

##### tokens

[`OAuthTokens`](../type-aliases/OAuthTokens.md)

OAuth tokens to store

#### Returns

`Promise`\<`void`\>

#### Implementation of

`TokenStorage.saveTokens`

---

### deleteTokens()

> **deleteTokens**(`serverId`): `Promise`\<`void`\>

Defined in: [mcp/auth/tokenStorage.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L25)

Delete stored tokens for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

#### Returns

`Promise`\<`void`\>

#### Implementation of

`TokenStorage.deleteTokens`

---

### hasTokens()

> **hasTokens**(`serverId`): `Promise`\<`boolean`\>

Defined in: [mcp/auth/tokenStorage.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L29)

Check if tokens exist for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

#### Returns

`Promise`\<`boolean`\>

True if tokens exist

#### Implementation of

`TokenStorage.hasTokens`

---

### clearAll()

> **clearAll**(): `Promise`\<`void`\>

Defined in: [mcp/auth/tokenStorage.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L33)

Clear all stored tokens

#### Returns

`Promise`\<`void`\>

#### Implementation of

`TokenStorage.clearAll`

---

### getServerIds()

> **getServerIds**(): `string`[]

Defined in: [mcp/auth/tokenStorage.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L47)

Get all server IDs with stored tokens

#### Returns

`string`[]
