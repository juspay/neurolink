[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthConfig

# Type Alias: AnthropicAuthConfig

> **AnthropicAuthConfig** = `object`

Defined in: [types/subscription.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L243)

Anthropic authentication configuration

## Description

Configuration interface for authenticating with Anthropic services.
Supports both API key and OAuth authentication methods.

## Properties

### method

> **method**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L248)

Authentication method to use

#### See

AnthropicAuthMethod

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L254)

API key for API key authentication method

#### Description

Required when method is "api_key"

---

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

Defined in: [types/subscription.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L260)

OAuth token object for OAuth authentication method

#### Description

Full OAuth token with access, refresh, and expiry information

---

### ~~accessToken?~~

> `optional` **accessToken?**: `string`

Defined in: [types/subscription.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L267)

OAuth access token for OAuth authentication method

#### Description

Required when method is "oauth", obtained through OAuth flow

#### Deprecated

Use oauthToken.accessToken instead

---

### ~~refreshToken?~~

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L274)

OAuth refresh token for obtaining new access tokens

#### Description

Optional for OAuth method, enables automatic token refresh

#### Deprecated

Use oauthToken.refreshToken instead

---

### ~~tokenExpiry?~~

> `optional` **tokenExpiry?**: `number`

Defined in: [types/subscription.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L281)

Token expiry timestamp in milliseconds (Unix epoch)

#### Description

Used to determine when access token needs to be refreshed

#### Deprecated

Use oauthToken.expiresAt instead

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L287)

User's subscription tier

#### Description

Determines rate limits, features, and capabilities available

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Defined in: [types/subscription.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L293)

Whether to automatically refresh OAuth tokens

#### Description

When true, tokens will be refreshed before expiry
