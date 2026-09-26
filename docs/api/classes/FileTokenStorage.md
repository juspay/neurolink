[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileTokenStorage

# Class: FileTokenStorage

File-based token storage implementation
Persists tokens to disk for cross-session use

## Implements

- [`TokenStorage`](../type-aliases/TokenStorage.md)

## Constructors

### Constructor

> **new FileTokenStorage**(`filePath`): `FileTokenStorage`

#### Parameters

##### filePath

`string`

#### Returns

`FileTokenStorage`

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
