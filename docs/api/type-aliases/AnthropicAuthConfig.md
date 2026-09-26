[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthConfig

# Type Alias: AnthropicAuthConfig

> **AnthropicAuthConfig** = `object`

Anthropic authentication configuration

## Description

Configuration interface for authenticating with Anthropic services.
Supports both API key and OAuth authentication methods.

## Properties

### method

> **method**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Authentication method to use

#### See

AnthropicAuthMethod

---

### apiKey?

> `optional` **apiKey?**: `string`

API key for API key authentication method

#### Description

Required when method is "api_key"

---

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

OAuth token object for OAuth authentication method

#### Description

Full OAuth token with access, refresh, and expiry information

---

### ~~accessToken?~~

> `optional` **accessToken?**: `string`

OAuth access token for OAuth authentication method

#### Description

Required when method is "oauth", obtained through OAuth flow

#### Deprecated

Use oauthToken.accessToken instead

---

### ~~refreshToken?~~

> `optional` **refreshToken?**: `string`

OAuth refresh token for obtaining new access tokens

#### Description

Optional for OAuth method, enables automatic token refresh

#### Deprecated

Use oauthToken.refreshToken instead

---

### ~~tokenExpiry?~~

> `optional` **tokenExpiry?**: `number`

Token expiry timestamp in milliseconds (Unix epoch)

#### Description

Used to determine when access token needs to be refreshed

#### Deprecated

Use oauthToken.expiresAt instead

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

User's subscription tier

#### Description

Determines rate limits, features, and capabilities available

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Whether to automatically refresh OAuth tokens

#### Description

When true, tokens will be refreshed before expiry
