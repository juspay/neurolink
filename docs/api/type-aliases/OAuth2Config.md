[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2Config

# Type Alias: OAuth2Config

> **OAuth2Config** = `object`

Defined in: [types/auth.ts:757](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L757)

Generic OAuth2 provider configuration

## Properties

### authorizationUrl

> **authorizationUrl**: `string`

Defined in: [types/auth.ts:759](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L759)

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Defined in: [types/auth.ts:761](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L761)

Token endpoint URL

---

### userInfoUrl?

> `optional` **userInfoUrl?**: `string`

Defined in: [types/auth.ts:763](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L763)

User info endpoint URL

---

### jwksUrl?

> `optional` **jwksUrl?**: `string`

Defined in: [types/auth.ts:765](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L765)

JWKS endpoint URL

---

### clientId

> **clientId**: `string`

Defined in: [types/auth.ts:767](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L767)

Client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/auth.ts:769](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L769)

Client secret

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/auth.ts:771](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L771)

OAuth scopes

---

### redirectUrl?

> `optional` **redirectUrl?**: `string`

Defined in: [types/auth.ts:773](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L773)

Redirect URL

---

### usePKCE?

> `optional` **usePKCE?**: `boolean`

Defined in: [types/auth.ts:775](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L775)

Enable PKCE
