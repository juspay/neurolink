[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthToken

# Type Alias: OAuthToken

> **OAuthToken** = `object`

OAuth token structure for Claude subscriptions

## Description

Contains the OAuth token information for authenticated sessions

## Properties

### accessToken

> **accessToken**: `string`

The access token for API requests

---

### refreshToken?

> `optional` **refreshToken?**: `string`

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Token expiration timestamp (Unix milliseconds, i.e. Date.now() scale)

---

### tokenType?

> `optional` **tokenType?**: `string`

Token type (typically "Bearer")

---

### scopes?

> `optional` **scopes?**: `string`[]

Scopes granted to this token
