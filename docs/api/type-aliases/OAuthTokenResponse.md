[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenResponse

# Type Alias: OAuthTokenResponse

> **OAuthTokenResponse** = `object`

Defined in: [types/subscription.ts:871](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L871)

OAuth 2.0 token response from Anthropic (raw API response shape)

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/subscription.ts:873](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L873)

The access token for API authentication

---

### token_type

> **token_type**: `string`

Defined in: [types/subscription.ts:875](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L875)

Token type (typically "Bearer")

---

### expires_in

> **expires_in**: `number`

Defined in: [types/subscription.ts:877](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L877)

Token expiration time in seconds

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/subscription.ts:879](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L879)

Refresh token for obtaining new access tokens

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/subscription.ts:881](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L881)

Granted scopes (space-separated)
