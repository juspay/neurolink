[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryTokenStorage

# Class: InMemoryTokenStorage

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

Get the number of stored token sets

##### Returns

`number`

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

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

Clear all stored tokens

#### Returns

`Promise`\<`void`\>

#### Implementation of

`TokenStorage.clearAll`

---

### getServerIds()

> **getServerIds**(): `string`[]

Get all server IDs with stored tokens

#### Returns

`string`[]
