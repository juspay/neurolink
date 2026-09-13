[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerInfo

# Type Alias: MCPServerInfo

> **MCPServerInfo** = `object`

Defined in: [types/mcp.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L89)

Universal MCP Server - Unified configuration and runtime state
MCP 2024-11-05 specification compliant
Replaces both MCPServerInfo and MCPServerConfig

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L91)

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L92)

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L93)

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L94)

---

### status

> **status**: [`MCPServerConnectionStatus`](MCPServerConnectionStatus.md)

Defined in: [types/mcp.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L95)

---

### tools

> **tools**: `object`[]

Defined in: [types/mcp.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L98)

#### name

> **name**: `string`

#### description

> **description**: `string`

#### inputSchema?

> `optional` **inputSchema?**: `object`

#### execute?

> `optional` **execute?**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

##### Parameters

###### params

`unknown`

###### context?

`unknown`

##### Returns

`Promise`\<`unknown`\> \| `unknown`

---

### command?

> `optional` **command?**: `string`

Defined in: [types/mcp.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L109)

---

### args?

> `optional` **args?**: `string`[]

Defined in: [types/mcp.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L110)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L111)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/mcp.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L112)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L113)

---

### httpOptions?

> `optional` **httpOptions?**: [`MCPHTTPTransportOptions`](MCPHTTPTransportOptions.md)

Defined in: [types/mcp.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L115)

HTTP transport-specific options

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L116)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/mcp.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L117)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L118)

---

### installed?

> `optional` **installed?**: `boolean`

Defined in: [types/mcp.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L119)

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/mcp.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L122)

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

Defined in: [types/mcp.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L123)

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L124)

---

### minTools?

> `optional` **minTools?**: `number`

Defined in: [types/mcp.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L135)

Minimum number of tools that must be discovered for this server's
registration to be considered ready (default: 0 — no minimum, so a
resource/prompt-only server that legitimately exposes zero tools still
registers successfully). When discovery finds fewer tools than this
floor, `ExternalServerManager.addServer` returns `success: false` with
`metadata.readiness: "insufficient_tools"` instead of marking the
server connected/healthy, and tears the connection back down.

---

### retryConfig?

> `optional` **retryConfig?**: `object`

Defined in: [types/mcp.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L138)

Retry configuration for HTTP transport

#### maxAttempts?

> `optional` **maxAttempts?**: `number`

#### initialDelay?

> `optional` **initialDelay?**: `number`

#### maxDelay?

> `optional` **maxDelay?**: `number`

#### backoffMultiplier?

> `optional` **backoffMultiplier?**: `number`

---

### rateLimiting?

> `optional` **rateLimiting?**: `object`

Defined in: [types/mcp.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L146)

Rate limiting configuration for HTTP transport

#### requestsPerMinute?

> `optional` **requestsPerMinute?**: `number`

Maximum requests per minute (default: 60)

#### requestsPerHour?

> `optional` **requestsPerHour?**: `number`

Maximum requests per hour (optional)

#### maxBurst?

> `optional` **maxBurst?**: `number`

Maximum burst size for token bucket (default: 10)

#### useTokenBucket?

> `optional` **useTokenBucket?**: `boolean`

Use token bucket algorithm (default: true)

---

### blockedTools?

> `optional` **blockedTools?**: `string`[]

Defined in: [types/mcp.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L158)

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/mcp.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L161)

Authentication configuration for HTTP/SSE/WebSocket transports

#### type

> **type**: `"oauth2"` \| `"bearer"` \| `"api-key"`

Authentication type

#### oauth?

> `optional` **oauth?**: `object`

OAuth 2.1 configuration

##### oauth.clientId

> **clientId**: `string`

OAuth client ID

##### oauth.clientSecret?

> `optional` **clientSecret?**: `string`

OAuth client secret (optional for public clients with PKCE)

##### oauth.authorizationUrl

> **authorizationUrl**: `string`

Authorization endpoint URL

##### oauth.tokenUrl

> **tokenUrl**: `string`

Token endpoint URL

##### oauth.redirectUrl

> **redirectUrl**: `string`

Redirect URI for OAuth callback

##### oauth.scope?

> `optional` **scope?**: `string`

OAuth scope (space-separated)

##### oauth.usePKCE?

> `optional` **usePKCE?**: `boolean`

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

#### token?

> `optional` **token?**: `string`

Bearer token for simple token authentication

#### apiKey?

> `optional` **apiKey?**: `string`

API key for API key authentication

#### apiKeyHeader?

> `optional` **apiKeyHeader?**: `string`

Header name for API key (default: "X-API-Key")

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L190)

#### Index Signature

\[`key`: `string`\]: `unknown`

#### uptime?

> `optional` **uptime?**: `number`

#### toolCount?

> `optional` **toolCount?**: `number`

#### category?

> `optional` **category?**: [`MCPServerCategory`](MCPServerCategory.md)

#### provider?

> `optional` **provider?**: `string`

#### version?

> `optional` **version?**: `string`

#### author?

> `optional` **author?**: `string`

#### tags?

> `optional` **tags?**: `string`[]
