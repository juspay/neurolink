[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicOAuthConfig

# Type Alias: AnthropicOAuthConfig

> **AnthropicOAuthConfig** = `object`

OAuth configuration options for AnthropicOAuth class

## Properties

### clientId?

> `optional` **clientId?**: `string`

OAuth client ID (optional, uses env var if not provided)

---

### clientSecret?

> `optional` **clientSecret?**: `string`

OAuth client secret (optional, for confidential clients)

---

### redirectUri?

> `optional` **redirectUri?**: `string`

Redirect URI for OAuth callback

---

### scopes?

> `optional` **scopes?**: `string`[]

OAuth scopes to request

---

### authorizationUrl?

> `optional` **authorizationUrl?**: `string`

Custom authorization endpoint URL

---

### tokenUrl?

> `optional` **tokenUrl?**: `string`

Custom token endpoint URL

---

### validationUrl?

> `optional` **validationUrl?**: `string`

Custom token validation endpoint URL

---

### revocationUrl?

> `optional` **revocationUrl?**: `string`

Custom token revocation endpoint URL
