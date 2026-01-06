[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileTokenStorage

# Class: FileTokenStorage

Defined in: [mcp/auth/tokenStorage.ts:56](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L56)

File-based token storage implementation
Persists tokens to disk for cross-session use

## Implements

- [`TokenStorage`](../type-aliases/TokenStorage.md)

## Constructors

### Constructor

> **new FileTokenStorage**(`filePath`): `FileTokenStorage`

Defined in: [mcp/auth/tokenStorage.ts:61](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L61)

#### Parameters

##### filePath

`string`

#### Returns

`FileTokenStorage`

## Methods

### getTokens()

> **getTokens**(`serverId`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

Defined in: [mcp/auth/tokenStorage.ts:112](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L112)

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

Defined in: [mcp/auth/tokenStorage.ts:117](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L117)

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

Defined in: [mcp/auth/tokenStorage.ts:123](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L123)

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

Defined in: [mcp/auth/tokenStorage.ts:129](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L129)

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

Defined in: [mcp/auth/tokenStorage.ts:134](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L134)

Clear all stored tokens

#### Returns

`Promise`\<`void`\>

#### Implementation of

`TokenStorage.clearAll`
