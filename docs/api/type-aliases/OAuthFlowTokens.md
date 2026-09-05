[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthFlowTokens

# Type Alias: OAuthFlowTokens

> **OAuthFlowTokens** = `object`

Defined in: [types/subscription.ts:971](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L971)

Parsed OAuth tokens from a fresh OAuth flow.
Uses Date for expiresAt (vs number in OAuthTokens for storage).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:973](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L973)

The access token for API authentication

---

### tokenType

> **tokenType**: `string`

Defined in: [types/subscription.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L975)

Token type (typically "Bearer")

---

### expiresAt

> **expiresAt**: `Date`

Defined in: [types/subscription.ts:977](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L977)

Expiration timestamp (Date object)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:979](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L979)

Refresh token for obtaining new access tokens

---

### scopes

> **scopes**: `string`[]

Defined in: [types/subscription.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L981)

Granted scopes as an array
