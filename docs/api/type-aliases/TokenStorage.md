[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorage

# Type Alias: TokenStorage

> **TokenStorage** = `object`

Defined in: [types/mcp.ts:862](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L862)

Token storage type for OAuth 2.1 authentication
Implementations can use in-memory, file-based, or external storage

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](OAuthTokens.md) \| `null`\>

Defined in: [types/mcp.ts:868](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L868)

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

Defined in: [types/mcp.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L875)

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

Defined in: [types/mcp.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L881)

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

Defined in: [types/mcp.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L888)

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

Defined in: [types/mcp.ts:893](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L893)

Clear all stored tokens

#### Returns

`Promise`\<`void`\>
