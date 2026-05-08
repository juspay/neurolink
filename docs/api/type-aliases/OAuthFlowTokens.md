[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthFlowTokens

# Type Alias: OAuthFlowTokens

> **OAuthFlowTokens** = `object`

Defined in: [types/subscription.ts:888](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L888)

Parsed OAuth tokens from a fresh OAuth flow.
Uses Date for expiresAt (vs number in OAuthTokens for storage).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:890](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L890)

The access token for API authentication

---

### tokenType

> **tokenType**: `string`

Defined in: [types/subscription.ts:892](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L892)

Token type (typically "Bearer")

---

### expiresAt

> **expiresAt**: `Date`

Defined in: [types/subscription.ts:894](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L894)

Expiration timestamp (Date object)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:896](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L896)

Refresh token for obtaining new access tokens

---

### scopes

> **scopes**: `string`[]

Defined in: [types/subscription.ts:898](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L898)

Granted scopes as an array
