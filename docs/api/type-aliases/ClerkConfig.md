[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClerkConfig

# Type Alias: ClerkConfig

> **ClerkConfig** = `object`

Defined in: [types/auth.ts:672](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L672)

Clerk provider configuration

## Properties

### publishableKey?

> `optional` **publishableKey?**: `string`

Defined in: [types/auth.ts:674](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L674)

Clerk publishable key

---

### secretKey

> **secretKey**: `string`

Defined in: [types/auth.ts:676](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L676)

Clerk secret key

---

### jwtKey?

> `optional` **jwtKey?**: `string`

Defined in: [types/auth.ts:678](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L678)

Clerk JWT key (for local validation)

---

### apiVersion?

> `optional` **apiVersion?**: `string`

Defined in: [types/auth.ts:680](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L680)

Clerk API version

---

### jwksUrl?

> `optional` **jwksUrl?**: `string`

Defined in: [types/auth.ts:682](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L682)

JWKS endpoint override

---

### allowedOrigins?

> `optional` **allowedOrigins?**: `string`[]

Defined in: [types/auth.ts:684](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L684)

Allowed origins
