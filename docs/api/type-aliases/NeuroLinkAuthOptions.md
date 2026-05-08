[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAuthOptions

# Type Alias: NeuroLinkAuthOptions

> **NeuroLinkAuthOptions** = `object`

Defined in: [types/subscription.ts:993](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L993)

Unified authentication options for NeuroLink

Supports both direct API key authentication and OAuth-based authentication
for Claude Pro/Max subscriptions.

## Properties

### method

> **method**: `"api-key"` \| `"oauth"`

Defined in: [types/subscription.ts:999](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L999)

Authentication method to use

- "api-key": Use ANTHROPIC_API_KEY environment variable
- "oauth": Use OAuth 2.0 flow for Claude Pro/Max subscriptions

---

### oauth?

> `optional` **oauth?**: `object`

Defined in: [types/subscription.ts:1004](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1004)

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

Defined in: [types/subscription.ts:1016](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1016)

Token storage configuration (optional, defaults to file-based storage)

#### encryptionEnabled?

> `optional` **encryptionEnabled?**: `boolean`

Enable encryption for stored tokens

#### customStoragePath?

> `optional` **customStoragePath?**: `string`

Custom storage path
