[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPOAuthConfig

# Type Alias: MCPOAuthConfig

> **MCPOAuthConfig** = `object`

Defined in: [types/mcp.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L899)

OAuth 2.1 configuration for MCP servers

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/mcp.ts:901](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L901)

OAuth client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/mcp.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L903)

OAuth client secret (optional for public clients with PKCE)

---

### authorizationUrl

> **authorizationUrl**: `string`

Defined in: [types/mcp.ts:905](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L905)

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Defined in: [types/mcp.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L907)

Token endpoint URL

---

### redirectUrl

> **redirectUrl**: `string`

Defined in: [types/mcp.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L909)

Redirect URI for OAuth callback

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:911](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L911)

OAuth scope (space-separated)

---

### usePKCE?

> `optional` **usePKCE?**: `boolean`

Defined in: [types/mcp.ts:913](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L913)

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

---

### additionalParams?

> `optional` **additionalParams?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:915](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L915)

Additional authorization parameters
