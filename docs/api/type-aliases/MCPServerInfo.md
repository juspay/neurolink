[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerInfo

# Type Alias: MCPServerInfo

> **MCPServerInfo** = `object`

Defined in: [types/mcp.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L81)

Universal MCP Server - Unified configuration and runtime state
MCP 2024-11-05 specification compliant
Replaces both MCPServerInfo and MCPServerConfig

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L83)

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L84)

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L85)

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L86)

---

### status

> **status**: [`MCPServerConnectionStatus`](MCPServerConnectionStatus.md)

Defined in: [types/mcp.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L87)

---

### tools

> **tools**: `object`[]

Defined in: [types/mcp.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L90)

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

Defined in: [types/mcp.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L101)

---

### args?

> `optional` **args?**: `string`[]

Defined in: [types/mcp.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L102)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L103)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/mcp.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L104)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/mcp.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L105)

---

### httpOptions?

> `optional` **httpOptions?**: [`MCPHTTPTransportOptions`](MCPHTTPTransportOptions.md)

Defined in: [types/mcp.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L107)

HTTP transport-specific options

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L108)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/mcp.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L109)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L110)

---

### installed?

> `optional` **installed?**: `boolean`

Defined in: [types/mcp.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L111)

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/mcp.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L114)

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

Defined in: [types/mcp.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L115)

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/mcp.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L116)

---

### retryConfig?

> `optional` **retryConfig?**: `object`

Defined in: [types/mcp.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L119)

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

Defined in: [types/mcp.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L127)

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

Defined in: [types/mcp.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L139)

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/mcp.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L142)

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

Defined in: [types/mcp.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L171)

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
