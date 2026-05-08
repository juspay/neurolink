[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefreshResult

# Type Alias: TokenRefreshResult

> **TokenRefreshResult** = `object`

Defined in: [types/auth.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L260)

Token refresh result

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L262)

New access token

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L264)

New refresh token (if rotated)

---

### expiresIn

> **expiresIn**: `number`

Defined in: [types/auth.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L266)

Token expiration in seconds
