[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicOAuthConfig

# Type Alias: AnthropicOAuthConfig

> **AnthropicOAuthConfig** = `object`

Defined in: [types/subscription.ts:1006](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1006)

OAuth configuration options for AnthropicOAuth class

## Properties

### clientId?

> `optional` **clientId?**: `string`

Defined in: [types/subscription.ts:1008](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1008)

OAuth client ID (optional, uses env var if not provided)

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/subscription.ts:1010](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1010)

OAuth client secret (optional, for confidential clients)

---

### redirectUri?

> `optional` **redirectUri?**: `string`

Defined in: [types/subscription.ts:1012](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1012)

Redirect URI for OAuth callback

---

### scopes?

> `optional` **scopes?**: `string`[]

Defined in: [types/subscription.ts:1014](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1014)

OAuth scopes to request

---

### authorizationUrl?

> `optional` **authorizationUrl?**: `string`

Defined in: [types/subscription.ts:1016](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1016)

Custom authorization endpoint URL

---

### tokenUrl?

> `optional` **tokenUrl?**: `string`

Defined in: [types/subscription.ts:1018](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1018)

Custom token endpoint URL

---

### validationUrl?

> `optional` **validationUrl?**: `string`

Defined in: [types/subscription.ts:1020](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1020)

Custom token validation endpoint URL

---

### revocationUrl?

> `optional` **revocationUrl?**: `string`

Defined in: [types/subscription.ts:1022](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1022)

Custom token revocation endpoint URL
