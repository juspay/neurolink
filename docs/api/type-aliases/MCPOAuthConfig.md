[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPOAuthConfig

# Type Alias: MCPOAuthConfig

> **MCPOAuthConfig** = `object`

Defined in: [types/mcp.ts:880](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L880)

OAuth 2.1 configuration for MCP servers

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/mcp.ts:882](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L882)

OAuth client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/mcp.ts:884](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L884)

OAuth client secret (optional for public clients with PKCE)

---

### authorizationUrl

> **authorizationUrl**: `string`

Defined in: [types/mcp.ts:886](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L886)

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Defined in: [types/mcp.ts:888](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L888)

Token endpoint URL

---

### redirectUrl

> **redirectUrl**: `string`

Defined in: [types/mcp.ts:890](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L890)

Redirect URI for OAuth callback

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:892](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L892)

OAuth scope (space-separated)

---

### usePKCE?

> `optional` **usePKCE?**: `boolean`

Defined in: [types/mcp.ts:894](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L894)

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

---

### additionalParams?

> `optional` **additionalParams?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:896](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L896)

Additional authorization parameters
