[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPOAuthConfig

# Type Alias: MCPOAuthConfig

> **MCPOAuthConfig** = `object`

OAuth 2.1 configuration for MCP servers

## Properties

### clientId

> **clientId**: `string`

OAuth client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

OAuth client secret (optional for public clients with PKCE)

---

### authorizationUrl

> **authorizationUrl**: `string`

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Token endpoint URL

---

### redirectUrl

> **redirectUrl**: `string`

Redirect URI for OAuth callback

---

### scope?

> `optional` **scope?**: `string`

OAuth scope (space-separated)

---

### usePKCE?

> `optional` **usePKCE?**: `boolean`

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

---

### additionalParams?

> `optional` **additionalParams?**: `Record`\<`string`, `string`\>

Additional authorization parameters
