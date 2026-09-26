[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerInfo

# Type Alias: MCPServerInfo

> **MCPServerInfo** = `object`

Universal MCP Server - Unified configuration and runtime state
MCP 2024-11-05 specification compliant
Replaces both MCPServerInfo and MCPServerConfig

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

---

### status

> **status**: [`MCPServerConnectionStatus`](MCPServerConnectionStatus.md)

---

### tools

> **tools**: `object`[]

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

---

### args?

> `optional` **args?**: `string`[]

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

---

### url?

> `optional` **url?**: `string`

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### httpOptions?

> `optional` **httpOptions?**: [`MCPHTTPTransportOptions`](MCPHTTPTransportOptions.md)

HTTP transport-specific options

---

### timeout?

> `optional` **timeout?**: `number`

---

### retries?

> `optional` **retries?**: `number`

---

### error?

> `optional` **error?**: `string`

---

### installed?

> `optional` **installed?**: `boolean`

---

### cwd?

> `optional` **cwd?**: `string`

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

---

### minTools?

> `optional` **minTools?**: `number`

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

---

### auth?

> `optional` **auth?**: `object`

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
