[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClerkConfig

# Type Alias: ClerkConfig

> **ClerkConfig** = `object`

Defined in: [types/auth.ts:672](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L672)

Clerk provider configuration

## Properties

### publishableKey?

> `optional` **publishableKey?**: `string`

Defined in: [types/auth.ts:674](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L674)

Clerk publishable key

---

### secretKey

> **secretKey**: `string`

Defined in: [types/auth.ts:676](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L676)

Clerk secret key

---

### jwtKey?

> `optional` **jwtKey?**: `string`

Defined in: [types/auth.ts:678](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L678)

Clerk JWT key (for local validation)

---

### apiVersion?

> `optional` **apiVersion?**: `string`

Defined in: [types/auth.ts:680](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L680)

Clerk API version

---

### jwksUrl?

> `optional` **jwksUrl?**: `string`

Defined in: [types/auth.ts:682](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L682)

JWKS endpoint override

---

### allowedOrigins?

> `optional` **allowedOrigins?**: `string`[]

Defined in: [types/auth.ts:684](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L684)

Allowed origins
