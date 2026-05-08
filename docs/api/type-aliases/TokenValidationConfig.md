[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenValidationConfig

# Type Alias: TokenValidationConfig

> **TokenValidationConfig** = `object`

Defined in: [types/auth.ts:422](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L422)

Token validation configuration

## Properties

### issuer?

> `optional` **issuer?**: `string`

Defined in: [types/auth.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L424)

Token issuer to validate against

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Defined in: [types/auth.ts:426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L426)

Token audience to validate against

---

### clockTolerance?

> `optional` **clockTolerance?**: `number`

Defined in: [types/auth.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L428)

Clock tolerance in seconds for expiration checks

---

### extractClaims?

> `optional` **extractClaims?**: `string`[]

Defined in: [types/auth.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L430)

Custom claims to extract

---

### validateSignature?

> `optional` **validateSignature?**: `boolean`

Defined in: [types/auth.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L432)

Whether to validate token signature

---

### jwksUri?

> `optional` **jwksUri?**: `string`

Defined in: [types/auth.ts:434](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L434)

JWKS endpoint for signature verification

---

### jwksCacheDuration?

> `optional` **jwksCacheDuration?**: `number`

Defined in: [types/auth.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L436)

Cache JWKS for this duration (ms)
