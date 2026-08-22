[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefreshResult

# Type Alias: TokenRefreshResult

> **TokenRefreshResult** = `object`

Defined in: [types/auth.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L260)

Token refresh result

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L262)

New access token

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L264)

New refresh token (if rotated)

---

### expiresIn

> **expiresIn**: `number`

Defined in: [types/auth.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L266)

Token expiration in seconds
