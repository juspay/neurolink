[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthFlowTokens

# Type Alias: OAuthFlowTokens

> **OAuthFlowTokens** = `object`

Defined in: [types/subscription.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L970)

Parsed OAuth tokens from a fresh OAuth flow.
Uses Date for expiresAt (vs number in OAuthTokens for storage).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L972)

The access token for API authentication

---

### tokenType

> **tokenType**: `string`

Defined in: [types/subscription.ts:974](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L974)

Token type (typically "Bearer")

---

### expiresAt

> **expiresAt**: `Date`

Defined in: [types/subscription.ts:976](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L976)

Expiration timestamp (Date object)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:978](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L978)

Refresh token for obtaining new access tokens

---

### scopes

> **scopes**: `string`[]

Defined in: [types/subscription.ts:980](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L980)

Granted scopes as an array
