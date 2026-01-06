[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorage

# Type Alias: TokenStorage

> **TokenStorage** = `object`

Defined in: [types/mcpTypes.ts:845](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L845)

Token storage type for OAuth 2.1 authentication
Implementations can use in-memory, file-based, or external storage

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](OAuthTokens.md) \| `null`\>

Defined in: [types/mcpTypes.ts:851](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L851)

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

Defined in: [types/mcpTypes.ts:858](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L858)

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

Defined in: [types/mcpTypes.ts:864](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L864)

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

Defined in: [types/mcpTypes.ts:871](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L871)

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

Defined in: [types/mcpTypes.ts:876](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L876)

Clear all stored tokens

#### Returns

`Promise`\<`void`\>
