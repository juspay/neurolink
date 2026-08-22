[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthConfig

# Type Alias: AnthropicAuthConfig

> **AnthropicAuthConfig** = `object`

Defined in: [types/subscription.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L242)

Anthropic authentication configuration

## Description

Configuration interface for authenticating with Anthropic services.
Supports both API key and OAuth authentication methods.

## Properties

### method

> **method**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L247)

Authentication method to use

#### See

AnthropicAuthMethod

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L253)

API key for API key authentication method

#### Description

Required when method is "api_key"

---

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

Defined in: [types/subscription.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L259)

OAuth token object for OAuth authentication method

#### Description

Full OAuth token with access, refresh, and expiry information

---

### ~~accessToken?~~

> `optional` **accessToken?**: `string`

Defined in: [types/subscription.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L266)

OAuth access token for OAuth authentication method

#### Description

Required when method is "oauth", obtained through OAuth flow

#### Deprecated

Use oauthToken.accessToken instead

---

### ~~refreshToken?~~

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L273)

OAuth refresh token for obtaining new access tokens

#### Description

Optional for OAuth method, enables automatic token refresh

#### Deprecated

Use oauthToken.refreshToken instead

---

### ~~tokenExpiry?~~

> `optional` **tokenExpiry?**: `number`

Defined in: [types/subscription.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L280)

Token expiry timestamp in milliseconds (Unix epoch)

#### Description

Used to determine when access token needs to be refreshed

#### Deprecated

Use oauthToken.expiresAt instead

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L286)

User's subscription tier

#### Description

Determines rate limits, features, and capabilities available

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Defined in: [types/subscription.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L292)

Whether to automatically refresh OAuth tokens

#### Description

When true, tokens will be refreshed before expiry
