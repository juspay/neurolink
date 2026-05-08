[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthConfig

# Type Alias: AnthropicAuthConfig

> **AnthropicAuthConfig** = `object`

Defined in: [types/subscription.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L160)

Anthropic authentication configuration

## Description

Configuration interface for authenticating with Anthropic services.
Supports both API key and OAuth authentication methods.

## Properties

### method

> **method**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L165)

Authentication method to use

#### See

AnthropicAuthMethod

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L171)

API key for API key authentication method

#### Description

Required when method is "api_key"

---

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

Defined in: [types/subscription.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L177)

OAuth token object for OAuth authentication method

#### Description

Full OAuth token with access, refresh, and expiry information

---

### ~~accessToken?~~

> `optional` **accessToken?**: `string`

Defined in: [types/subscription.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L184)

OAuth access token for OAuth authentication method

#### Description

Required when method is "oauth", obtained through OAuth flow

#### Deprecated

Use oauthToken.accessToken instead

---

### ~~refreshToken?~~

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L191)

OAuth refresh token for obtaining new access tokens

#### Description

Optional for OAuth method, enables automatic token refresh

#### Deprecated

Use oauthToken.refreshToken instead

---

### ~~tokenExpiry?~~

> `optional` **tokenExpiry?**: `number`

Defined in: [types/subscription.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L198)

Token expiry timestamp in milliseconds (Unix epoch)

#### Description

Used to determine when access token needs to be refreshed

#### Deprecated

Use oauthToken.expiresAt instead

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L204)

User's subscription tier

#### Description

Determines rate limits, features, and capabilities available

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Defined in: [types/subscription.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L210)

Whether to automatically refresh OAuth tokens

#### Description

When true, tokens will be refreshed before expiry
