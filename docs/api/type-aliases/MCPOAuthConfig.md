[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPOAuthConfig

# Type Alias: MCPOAuthConfig

> **MCPOAuthConfig** = `object`

Defined in: [types/mcp.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L918)

OAuth 2.1 configuration for MCP servers

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/mcp.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L920)

OAuth client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/mcp.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L922)

OAuth client secret (optional for public clients with PKCE)

---

### authorizationUrl

> **authorizationUrl**: `string`

Defined in: [types/mcp.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L924)

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Defined in: [types/mcp.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L926)

Token endpoint URL

---

### redirectUrl

> **redirectUrl**: `string`

Defined in: [types/mcp.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L928)

Redirect URI for OAuth callback

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L930)

OAuth scope (space-separated)

---

### usePKCE?

> `optional` **usePKCE?**: `boolean`

Defined in: [types/mcp.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L932)

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

---

### additionalParams?

> `optional` **additionalParams?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L934)

Additional authorization parameters
