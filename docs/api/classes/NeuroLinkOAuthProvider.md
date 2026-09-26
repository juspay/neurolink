[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkOAuthProvider

# Class: NeuroLinkOAuthProvider

NeuroLink OAuth Provider for MCP HTTP Transport
Handles OAuth 2.1 authentication flow with optional PKCE support

## Constructors

### Constructor

> **new NeuroLinkOAuthProvider**(`config`, `storage?`): `NeuroLinkOAuthProvider`

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

Delete tokens for a server

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`void`\>

---

### clientInformation()

> **clientInformation**(): [`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

Get client information for MCP SDK

#### Returns

[`OAuthClientInformation`](../type-aliases/OAuthClientInformation.md)

---

### redirectToAuthorization()

> **redirectToAuthorization**(`_serverId`): [`AuthorizationUrlResult`](../type-aliases/AuthorizationUrlResult.md)

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

Get authorization header value for API requests

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### hasValidTokens()

> **hasValidTokens**(`serverId`): `Promise`\<`boolean`\>

Check if a server has valid (non-expired) tokens

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### getConfig()

> **getConfig**(): `Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

Get the OAuth configuration

#### Returns

`Readonly`\<[`MCPOAuthConfig`](../type-aliases/MCPOAuthConfig.md)\>

---

### getStorage()

> **getStorage**(): [`TokenStorage`](../type-aliases/TokenStorage.md)

Get the token storage instance

#### Returns

[`TokenStorage`](../type-aliases/TokenStorage.md)

---

### cleanupPendingRequests()

> **cleanupPendingRequests**(): `void`

Clean up expired pending states and challenges
Should be called periodically to prevent memory leaks

#### Returns

`void`
