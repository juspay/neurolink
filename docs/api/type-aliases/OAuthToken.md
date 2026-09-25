[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthToken

# Type Alias: OAuthToken

> **OAuthToken** = `object`

Defined in: [types/subscription.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L65)

OAuth token structure for Claude subscriptions

## Description

Contains the OAuth token information for authenticated sessions

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/subscription.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L69)

The access token for API requests

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/subscription.ts:74](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L74)

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L79)

Token expiration timestamp (Unix milliseconds, i.e. Date.now() scale)

---

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [types/subscription.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L84)

Token type (typically "Bearer")

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L89)

Scopes granted to this token
