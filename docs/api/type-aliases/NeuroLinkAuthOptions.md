[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAuthOptions

# Type Alias: NeuroLinkAuthOptions

> **NeuroLinkAuthOptions** = `object`

Defined in: [types/subscription.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1075)

Unified authentication options for NeuroLink

Supports both direct API key authentication and OAuth-based authentication
for Claude Pro/Max subscriptions.

## Properties

### method

> **method**: `"api-key"` \| `"oauth"`

Defined in: [types/subscription.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1081)

Authentication method to use

- "api-key": Use ANTHROPIC_API_KEY environment variable
- "oauth": Use OAuth 2.0 flow for Claude Pro/Max subscriptions

---

### oauth?

> `optional` **oauth?**: `object`

Defined in: [types/subscription.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1086)

OAuth configuration (required when method is "oauth")

#### clientId?

> `optional` **clientId?**: `string`

OAuth client ID

#### redirectUri?

> `optional` **redirectUri?**: `string`

OAuth redirect URI

#### scopes?

> `optional` **scopes?**: `string`[]

Custom scopes to request

---

### tokenStorage?

> `optional` **tokenStorage?**: `object`

Defined in: [types/subscription.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1098)

Token storage configuration (optional, defaults to file-based storage)

#### encryptionEnabled?

> `optional` **encryptionEnabled?**: `boolean`

Enable encryption for stored tokens

#### customStoragePath?

> `optional` **customStoragePath?**: `string`

Custom storage path
