[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenResponse

# Type Alias: OAuthTokenResponse

> **OAuthTokenResponse** = `object`

Defined in: [types/subscription.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L954)

OAuth 2.0 token response from Anthropic (raw API response shape)

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/subscription.ts:956](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L956)

The access token for API authentication

---

### token_type

> **token_type**: `string`

Defined in: [types/subscription.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L958)

Token type (typically "Bearer")

---

### expires_in

> **expires_in**: `number`

Defined in: [types/subscription.ts:960](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L960)

Token expiration time in seconds

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/subscription.ts:962](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L962)

Refresh token for obtaining new access tokens

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/subscription.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L964)

Granted scopes (space-separated)
