[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthToken

# Type Alias: OAuthToken

> **OAuthToken** = `object`

Defined in: [types/subscription.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L64)

OAuth token structure for Claude subscriptions

## Description

Contains the OAuth token information for authenticated sessions

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L68)

The access token for API requests

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L73)

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L78)

Token expiration timestamp (Unix milliseconds, i.e. Date.now() scale)

---

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [types/subscription.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L83)

Token type (typically "Bearer")

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L88)

Scopes granted to this token
