[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkOAuthProvider

# Class: NeuroLinkOAuthProvider

Defined in: [mcp/auth/oauthClientProvider.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L32)

NeuroLink OAuth Provider for MCP HTTP Transport
Handles OAuth 2.1 authentication flow with optional PKCE support

## Constructors

### Constructor

> **new NeuroLinkOAuthProvider**(`config`, `storage?`): `NeuroLinkOAuthProvider`

Defined in: [mcp/auth/oauthClientProvider.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L38)

#### Parameters

##### config

[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)

##### storage?

[`TokenStorage`](../type-aliases/TokenStorage.md)

#### Returns

`NeuroLinkOAuthProvider`

## Methods

### tokens()

> **tokens**(`serverId`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

Defined in: [mcp/auth/oauthClientProvider.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L50)

Get stored tokens for a server
Returns null if tokens are not available or expired (without refresh token)

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md) \| `null`\>

---

### saveTokens()

> **saveTokens**(`serverId`, `tokens`): `Promise`\<`void`\>

Defined in: [mcp/auth/oauthClientProvider.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L88)

Save tokens for a server

#### Parameters

##### serverId

`string`

##### tokens

[`OAuthTokens`](../type-aliases/OAuthTokens.md)

#### Returns

`Promise`\<`void`\>

---

### deleteTokens()

> **deleteTokens**(`serverId`): `Promise`\<`void`\>

Defined in: [mcp/auth/oauthClientProvider.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L95)

Delete tokens for a server

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`void`\>

---

### clientInformation()

> **clientInformation**(): [`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

Defined in: [mcp/auth/oauthClientProvider.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L102)

Get client information for MCP SDK

#### Returns

[`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

---

### redirectToAuthorization()

> **redirectToAuthorization**(`_serverId`): [`AuthorizationUrlResult`](../type-aliases/AuthorizationUrlResult.md)

Defined in: [mcp/auth/oauthClientProvider.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L115)

Generate authorization URL for OAuth flow
Returns the URL to redirect the user to for authorization

#### Parameters

##### \_serverId

`string`

Server ID (reserved for future use in state management)

#### Returns

[`AuthorizationUrlResult`](../type-aliases/AuthorizationUrlResult.md)

---

### exchangeCode()

> **exchangeCode**(`serverId`, `request`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md)\>

Defined in: [mcp/auth/oauthClientProvider.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L164)

Exchange authorization code for tokens

#### Parameters

##### serverId

`string`

##### request

[`TokenExchangeRequest`](../type-aliases/TokenExchangeRequest.md)

#### Returns

`Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md)\>

---

### refreshTokens()

> **refreshTokens**(`serverId`, `refreshToken`): `Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md)\>

Defined in: [mcp/auth/oauthClientProvider.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L246)

Refresh tokens using refresh token

#### Parameters

##### serverId

`string`

##### refreshToken

`string`

#### Returns

`Promise`\<[`OAuthTokens`](../type-aliases/OAuthTokens.md)\>

---

### revokeTokens()

> **revokeTokens**(`serverId`, `revocationUrl`): `Promise`\<`void`\>

Defined in: [mcp/auth/oauthClientProvider.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L303)

Revoke tokens (if supported by the OAuth server)

#### Parameters

##### serverId

`string`

##### revocationUrl

`string`

#### Returns

`Promise`\<`void`\>

---

### getAuthorizationHeader()

> **getAuthorizationHeader**(`serverId`): `Promise`\<`string` \| `null`\>

Defined in: [mcp/auth/oauthClientProvider.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L346)

Get authorization header value for API requests

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### hasValidTokens()

> **hasValidTokens**(`serverId`): `Promise`\<`boolean`\>

Defined in: [mcp/auth/oauthClientProvider.ts:359](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L359)

Check if a server has valid (non-expired) tokens

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### getConfig()

> **getConfig**(): `Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

Defined in: [mcp/auth/oauthClientProvider.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L394)

Get the OAuth configuration

#### Returns

`Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

---

### getStorage()

> **getStorage**(): [`TokenStorage`](../type-aliases/TokenStorage.md)

Defined in: [mcp/auth/oauthClientProvider.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L401)

Get the token storage instance

#### Returns

[`TokenStorage`](../type-aliases/TokenStorage.md)

---

### cleanupPendingRequests()

> **cleanupPendingRequests**(): `void`

Defined in: [mcp/auth/oauthClientProvider.ts:409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L409)

Clean up expired pending states and challenges
Should be called periodically to prevent memory leaks

#### Returns

`void`
