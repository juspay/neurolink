[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorage

# Type Alias: TokenStorage

> **TokenStorage** = `object`

Token storage type for OAuth 2.1 authentication
Implementations can use in-memory, file-based, or external storage

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](OAuthTokens.md) \| `null`\>

Get stored tokens for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

#### Returns

`Promise`\<[`OAuthTokens`](OAuthTokens.md) \| `null`\>

Stored tokens or null if not found

---

### saveTokens()

> **saveTokens**(`serverId`, `tokens`): `Promise`\<`void`\>

Save tokens for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

##### tokens

[`OAuthTokens`](OAuthTokens.md)

OAuth tokens to store

#### Returns

`Promise`\<`void`\>

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

---

### hasTokens()?

> `optional` **hasTokens**(`serverId`): `Promise`\<`boolean`\>

Check if tokens exist for a server

#### Parameters

##### serverId

`string`

Unique identifier for the MCP server

#### Returns

`Promise`\<`boolean`\>

True if tokens exist

---

### clearAll()?

> `optional` **clearAll**(): `Promise`\<`void`\>

Clear all stored tokens

#### Returns

`Promise`\<`void`\>
