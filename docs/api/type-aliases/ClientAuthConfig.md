[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAuthConfig

# Type Alias: ClientAuthConfig

> **ClientAuthConfig** = `object`

Authentication configuration options

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

API key for header-based authentication

---

### token?

> `optional` **token?**: `string`

Bearer token for JWT/OAuth authentication

---

### refreshToken?

> `optional` **refreshToken?**: () => `Promise`\<`string`\>

Token refresh function for automatic token renewal

#### Returns

`Promise`\<`string`\>

---

### tokenExpiresAt?

> `optional` **tokenExpiresAt?**: `number`

Token expiry time in milliseconds

---

### refreshBufferMs?

> `optional` **refreshBufferMs?**: `number`

Buffer time before expiry to refresh token (default: 60000ms)

---

### headerName?

> `optional` **headerName?**: `string`

Custom authorization header name (default: "Authorization")

---

### apiKeyHeaderName?

> `optional` **apiKeyHeaderName?**: `string`

Custom API key header name (default: "X-API-Key")
