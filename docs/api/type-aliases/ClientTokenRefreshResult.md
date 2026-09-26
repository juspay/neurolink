[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientTokenRefreshResult

# Type Alias: ClientTokenRefreshResult

> **ClientTokenRefreshResult** = `object`

Token refresh result

## Properties

### accessToken

> **accessToken**: `string`

Access token

---

### expiresIn

> **expiresIn**: `number`

Token expiry time in seconds

---

### tokenType

> **tokenType**: `string`

Token type (usually "Bearer")

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Refresh token (if provided)

---

### scope?

> `optional` **scope?**: `string`

OAuth2 scope (if provided)
