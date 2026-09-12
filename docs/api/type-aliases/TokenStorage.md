[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorage

# Type Alias: TokenStorage

> **TokenStorage** = `object`

Defined in: [types/mcp.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L881)

Token storage type for OAuth 2.1 authentication
Implementations can use in-memory, file-based, or external storage

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](OAuthTokens.md) \| `null`\>

Defined in: [types/mcp.ts:887](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L887)

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

Defined in: [types/mcp.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L894)

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

Defined in: [types/mcp.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L900)

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

Defined in: [types/mcp.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L907)

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

Defined in: [types/mcp.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L912)

Clear all stored tokens

#### Returns

`Promise`\<`void`\>
