[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientTokenRefreshResult

# Type Alias: ClientTokenRefreshResult

> **ClientTokenRefreshResult** = `object`

Defined in: [types/client.ts:1112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1112)

Token refresh result

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/client.ts:1114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1114)

Access token

---

### expiresIn

> **expiresIn**: `number`

Defined in: [types/client.ts:1116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1116)

Token expiry time in seconds

---

### tokenType

> **tokenType**: `string`

Defined in: [types/client.ts:1118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1118)

Token type (usually "Bearer")

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/client.ts:1120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1120)

Refresh token (if provided)

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/client.ts:1122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1122)

OAuth2 scope (if provided)
