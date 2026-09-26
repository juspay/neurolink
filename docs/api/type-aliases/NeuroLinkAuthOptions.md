[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAuthOptions

# Type Alias: NeuroLinkAuthOptions

> **NeuroLinkAuthOptions** = `object`

Unified authentication options for NeuroLink

Supports both direct API key authentication and OAuth-based authentication
for Claude Pro/Max subscriptions.

## Properties

### method

> **method**: `"api-key"` \| `"oauth"`

Authentication method to use

- "api-key": Use ANTHROPIC_API_KEY environment variable
- "oauth": Use OAuth 2.0 flow for Claude Pro/Max subscriptions

---

### oauth?

> `optional` **oauth?**: `object`

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

Token storage configuration (optional, defaults to file-based storage)

#### encryptionEnabled?

> `optional` **encryptionEnabled?**: `boolean`

Enable encryption for stored tokens

#### customStoragePath?

> `optional` **customStoragePath?**: `string`

Custom storage path
