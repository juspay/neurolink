[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerInfo

# Type Alias: MCPServerInfo

> **MCPServerInfo** = `object`

Defined in: [types/mcpTypes.ts:77](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L77)

Universal MCP Server - Unified configuration and runtime state
MCP 2024-11-05 specification compliant
Replaces both MCPServerInfo and MCPServerConfig

## Properties

### id

> **id**: `string`

Defined in: [types/mcpTypes.ts:79](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L79)

---

### name

> **name**: `string`

Defined in: [types/mcpTypes.ts:80](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L80)

---

### description

> **description**: `string`

Defined in: [types/mcpTypes.ts:81](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L81)

---

### transport

> **transport**: `MCPTransportType`

Defined in: [types/mcpTypes.ts:82](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L82)

---

### status

> **status**: `MCPServerConnectionStatus`

Defined in: [types/mcpTypes.ts:83](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L83)

---

### tools

> **tools**: `object`[]

Defined in: [types/mcpTypes.ts:86](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L86)

#### name

> **name**: `string`

#### description

> **description**: `string`

#### inputSchema?

> `optional` **inputSchema**: `object`

#### execute()?

> `optional` **execute**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

##### Parameters

###### params

`unknown`

###### context?

`unknown`

##### Returns

`Promise`\<`unknown`\> \| `unknown`

---

### command?

> `optional` **command**: `string`

Defined in: [types/mcpTypes.ts:97](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L97)

---

### args?

> `optional` **args**: `string`[]

Defined in: [types/mcpTypes.ts:98](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L98)

---

### env?

> `optional` **env**: `Record`\<`string`, `string`\>

Defined in: [types/mcpTypes.ts:99](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L99)

---

### url?

> `optional` **url**: `string`

Defined in: [types/mcpTypes.ts:100](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L100)

---

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [types/mcpTypes.ts:101](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L101)

---

### httpOptions?

> `optional` **httpOptions**: `MCPHTTPTransportOptions`

Defined in: [types/mcpTypes.ts:103](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L103)

HTTP transport-specific options

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types/mcpTypes.ts:104](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L104)

---

### retries?

> `optional` **retries**: `number`

Defined in: [types/mcpTypes.ts:105](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L105)

---

### error?

> `optional` **error**: `string`

Defined in: [types/mcpTypes.ts:106](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L106)

---

### installed?

> `optional` **installed**: `boolean`

Defined in: [types/mcpTypes.ts:107](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L107)

---

### cwd?

> `optional` **cwd**: `string`

Defined in: [types/mcpTypes.ts:110](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L110)

---

### autoRestart?

> `optional` **autoRestart**: `boolean`

Defined in: [types/mcpTypes.ts:111](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L111)

---

### healthCheckInterval?

> `optional` **healthCheckInterval**: `number`

Defined in: [types/mcpTypes.ts:112](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L112)

---

### retryConfig?

> `optional` **retryConfig**: `object`

Defined in: [types/mcpTypes.ts:115](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L115)

Retry configuration for HTTP transport

#### maxAttempts?

> `optional` **maxAttempts**: `number`

#### initialDelay?

> `optional` **initialDelay**: `number`

#### maxDelay?

> `optional` **maxDelay**: `number`

#### backoffMultiplier?

> `optional` **backoffMultiplier**: `number`

---

### rateLimiting?

> `optional` **rateLimiting**: `object`

Defined in: [types/mcpTypes.ts:123](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L123)

Rate limiting configuration for HTTP transport

#### requestsPerMinute?

> `optional` **requestsPerMinute**: `number`

Maximum requests per minute (default: 60)

#### requestsPerHour?

> `optional` **requestsPerHour**: `number`

Maximum requests per hour (optional)

#### maxBurst?

> `optional` **maxBurst**: `number`

Maximum burst size for token bucket (default: 10)

#### useTokenBucket?

> `optional` **useTokenBucket**: `boolean`

Use token bucket algorithm (default: true)

---

### blockedTools?

> `optional` **blockedTools**: `string`[]

Defined in: [types/mcpTypes.ts:135](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L135)

---

### auth?

> `optional` **auth**: `object`

Defined in: [types/mcpTypes.ts:138](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L138)

Authentication configuration for HTTP/SSE/WebSocket transports

#### type

> **type**: `"oauth2"` \| `"bearer"` \| `"api-key"`

Authentication type

#### oauth?

> `optional` **oauth**: `object`

OAuth 2.1 configuration

##### oauth.clientId

> **clientId**: `string`

OAuth client ID

##### oauth.clientSecret?

> `optional` **clientSecret**: `string`

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

> `optional` **scope**: `string`

OAuth scope (space-separated)

##### oauth.usePKCE?

> `optional` **usePKCE**: `boolean`

Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1

#### token?

> `optional` **token**: `string`

Bearer token for simple token authentication

#### apiKey?

> `optional` **apiKey**: `string`

API key for API key authentication

#### apiKeyHeader?

> `optional` **apiKeyHeader**: `string`

Header name for API key (default: "X-API-Key")

---

### metadata?

> `optional` **metadata**: `object`

Defined in: [types/mcpTypes.ts:167](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L167)

#### Index Signature

\[`key`: `string`\]: `unknown`

#### uptime?

> `optional` **uptime**: `number`

#### toolCount?

> `optional` **toolCount**: `number`

#### category?

> `optional` **category**: `MCPServerCategory`

#### provider?

> `optional` **provider**: `string`

#### version?

> `optional` **version**: `string`

#### author?

> `optional` **author**: `string`

#### tags?

> `optional` **tags**: `string`[]
