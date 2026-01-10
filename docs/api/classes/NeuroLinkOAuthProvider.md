[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkOAuthProvider

# Class: NeuroLinkOAuthProvider

Defined in: [mcp/auth/oauthClientProvider.ts:28](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L28)

NeuroLink OAuth Provider for MCP HTTP Transport
Handles OAuth 2.1 authentication flow with optional PKCE support

## Constructors

### Constructor

> **new NeuroLinkOAuthProvider**(`config`, `storage?`): `NeuroLinkOAuthProvider`

Defined in: [mcp/auth/oauthClientProvider.ts:34](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L34)

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

Defined in: [mcp/auth/oauthClientProvider.ts:46](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L46)

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

Defined in: [mcp/auth/oauthClientProvider.ts:84](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L84)

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

Defined in: [mcp/auth/oauthClientProvider.ts:91](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L91)

Delete tokens for a server

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`void`\>

---

### clientInformation()

> **clientInformation**(): [`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

Defined in: [mcp/auth/oauthClientProvider.ts:98](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L98)

Get client information for MCP SDK

#### Returns

[`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

---

### redirectToAuthorization()

> **redirectToAuthorization**(`_serverId`): [`AuthorizationUrlResult`](../type-aliases/AuthorizationUrlResult.md)

Defined in: [mcp/auth/oauthClientProvider.ts:111](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L111)

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

Defined in: [mcp/auth/oauthClientProvider.ts:160](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L160)

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

Defined in: [mcp/auth/oauthClientProvider.ts:236](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L236)

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

Defined in: [mcp/auth/oauthClientProvider.ts:286](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L286)

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

Defined in: [mcp/auth/oauthClientProvider.ts:322](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L322)

Get authorization header value for API requests

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### hasValidTokens()

> **hasValidTokens**(`serverId`): `Promise`\<`boolean`\>

Defined in: [mcp/auth/oauthClientProvider.ts:335](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L335)

Check if a server has valid (non-expired) tokens

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### getConfig()

> **getConfig**(): `Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

Defined in: [mcp/auth/oauthClientProvider.ts:370](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L370)

Get the OAuth configuration

#### Returns

`Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

---

### getStorage()

> **getStorage**(): [`TokenStorage`](../type-aliases/TokenStorage.md)

Defined in: [mcp/auth/oauthClientProvider.ts:377](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L377)

Get the token storage instance

#### Returns

[`TokenStorage`](../type-aliases/TokenStorage.md)

---

### cleanupPendingRequests()

> **cleanupPendingRequests**(): `void`

Defined in: [mcp/auth/oauthClientProvider.ts:385](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/oauthClientProvider.ts#L385)

Clean up expired pending states and challenges
Should be called periodically to prevent memory leaks

#### Returns

`void`
