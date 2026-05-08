[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicOAuthConfig

# Type Alias: AnthropicOAuthConfig

> **AnthropicOAuthConfig** = `object`

Defined in: [types/subscription.ts:924](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L924)

OAuth configuration options for AnthropicOAuth class

## Properties

### clientId?

> `optional` **clientId?**: `string`

Defined in: [types/subscription.ts:926](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L926)

OAuth client ID (optional, uses env var if not provided)

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/subscription.ts:928](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L928)

OAuth client secret (optional, for confidential clients)

---

### redirectUri?

> `optional` **redirectUri?**: `string`

Defined in: [types/subscription.ts:930](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L930)

Redirect URI for OAuth callback

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:932](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L932)

OAuth scopes to request

---

### authorizationUrl?

> `optional` **authorizationUrl?**: `string`

Defined in: [types/subscription.ts:934](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L934)

Custom authorization endpoint URL

---

### tokenUrl?

> `optional` **tokenUrl?**: `string`

Defined in: [types/subscription.ts:936](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L936)

Custom token endpoint URL

---

### validationUrl?

> `optional` **validationUrl?**: `string`

Defined in: [types/subscription.ts:938](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L938)

Custom token validation endpoint URL

---

### revocationUrl?

> `optional` **revocationUrl?**: `string`

Defined in: [types/subscription.ts:940](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L940)

Custom token revocation endpoint URL
