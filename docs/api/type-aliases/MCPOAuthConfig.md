[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPOAuthConfig

# Type Alias: MCPOAuthConfig

> **MCPOAuthConfig** = `object`

Defined in: [types/mcpTypes.ts:882](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L882)

OAuth 2.1 configuration for MCP servers

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/mcpTypes.ts:884](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L884)

OAuth client ID

---

### clientSecret?

> `optional` **clientSecret**: `string`

Defined in: [types/mcpTypes.ts:886](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L886)

OAuth client secret (optional for public clients with PKCE)

---

### authorizationUrl

> **authorizationUrl**: `string`

Defined in: [types/mcpTypes.ts:888](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L888)

Authorization endpoint URL

---

### tokenUrl

> **tokenUrl**: `string`

Defined in: [types/mcpTypes.ts:890](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L890)

Token endpoint URL

---

### redirectUrl

> **redirectUrl**: `string`

Defined in: [types/mcpTypes.ts:892](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L892)

Redirect URI for OAuth callback

---

### scope?

> `optional` **scope**: `string`

Defined in: [types/mcpTypes.ts:894](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L894)

OAuth scope (space-separated)

---

### usePKCE?

> `optional` **usePKCE**: `boolean`

Defined in: [types/mcpTypes.ts:896](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L896)

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

---

### additionalParams?

> `optional` **additionalParams**: `Record`\<`string`, `string`\>

Defined in: [types/mcpTypes.ts:898](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L898)

Additional authorization parameters
