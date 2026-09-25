[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthConfig

# Type Alias: AnthropicAuthConfig

> **AnthropicAuthConfig** = `object`

Defined in: [types/subscription.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L244)

Anthropic authentication configuration

## Description

Configuration interface for authenticating with Anthropic services.
Supports both API key and OAuth authentication methods.

## Properties

### method

> **method**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L249)

Authentication method to use

#### See

AnthropicAuthMethod

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L255)

API key for API key authentication method

#### Description

Required when method is "api_key"

---

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

Defined in: [types/subscription.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L261)

OAuth token object for OAuth authentication method

#### Description

Full OAuth token with access, refresh, and expiry information

---

### ~~accessToken?~~

> `optional` **accessToken?**: `string`

Defined in: [types/subscription.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L268)

OAuth access token for OAuth authentication method

#### Description

Required when method is "oauth", obtained through OAuth flow

#### Deprecated

Use oauthToken.accessToken instead

---

### ~~refreshToken?~~

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L275)

OAuth refresh token for obtaining new access tokens

#### Description

Optional for OAuth method, enables automatic token refresh

#### Deprecated

Use oauthToken.refreshToken instead

---

### ~~tokenExpiry?~~

> `optional` **tokenExpiry?**: `number`

Defined in: [types/subscription.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L282)

Token expiry timestamp in milliseconds (Unix epoch)

#### Description

Used to determine when access token needs to be refreshed

#### Deprecated

Use oauthToken.expiresAt instead

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L288)

User's subscription tier

#### Description

Determines rate limits, features, and capabilities available

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Defined in: [types/subscription.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L294)

Whether to automatically refresh OAuth tokens

#### Description

When true, tokens will be refreshed before expiry
