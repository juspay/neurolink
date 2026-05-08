[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthToken

# Type Alias: OAuthToken

> **OAuthToken** = `object`

Defined in: [types/subscription.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L63)

OAuth token structure for Claude subscriptions

## Description

Contains the OAuth token information for authenticated sessions

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L67)

The access token for API requests

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L72)

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L77)

Token expiration timestamp (Unix milliseconds, i.e. Date.now() scale)

---

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [types/subscription.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L82)

Token type (typically "Bearer")

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L87)

Scopes granted to this token
