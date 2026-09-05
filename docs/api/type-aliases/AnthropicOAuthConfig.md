[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicOAuthConfig

# Type Alias: AnthropicOAuthConfig

> **AnthropicOAuthConfig** = `object`

Defined in: [types/subscription.ts:1007](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1007)

OAuth configuration options for AnthropicOAuth class

## Properties

### clientId?

> `optional` **clientId?**: `string`

Defined in: [types/subscription.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1009)

OAuth client ID (optional, uses env var if not provided)

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/subscription.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1011)

OAuth client secret (optional, for confidential clients)

---

### redirectUri?

> `optional` **redirectUri?**: `string`

Defined in: [types/subscription.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1013)

Redirect URI for OAuth callback

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1015)

OAuth scopes to request

---

### authorizationUrl?

> `optional` **authorizationUrl?**: `string`

Defined in: [types/subscription.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1017)

Custom authorization endpoint URL

---

### tokenUrl?

> `optional` **tokenUrl?**: `string`

Defined in: [types/subscription.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1019)

Custom token endpoint URL

---

### validationUrl?

> `optional` **validationUrl?**: `string`

Defined in: [types/subscription.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1021)

Custom token validation endpoint URL

---

### revocationUrl?

> `optional` **revocationUrl?**: `string`

Defined in: [types/subscription.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1023)

Custom token revocation endpoint URL
