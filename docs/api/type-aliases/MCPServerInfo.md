[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / MCPServerInfo

# Type Alias: MCPServerInfo

> **MCPServerInfo** = `object`

Defined in: [types/mcpTypes.ts:76](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L76)

Universal MCP Server - Unified configuration and runtime state
MCP 2024-11-05 specification compliant
Replaces both MCPServerInfo and MCPServerConfig

## Properties

### id

> **id**: `string`

Defined in: [types/mcpTypes.ts:78](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L78)

---

### name

> **name**: `string`

Defined in: [types/mcpTypes.ts:79](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L79)

---

### description

> **description**: `string`

Defined in: [types/mcpTypes.ts:80](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L80)

---

### transport

> **transport**: `MCPTransportType`

Defined in: [types/mcpTypes.ts:81](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L81)

---

### status

> **status**: `MCPServerConnectionStatus`

Defined in: [types/mcpTypes.ts:82](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L82)

---

### tools

> **tools**: `object`[]

Defined in: [types/mcpTypes.ts:85](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L85)

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

Defined in: [types/mcpTypes.ts:96](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L96)

---

### args?

> `optional` **args**: `string`[]

Defined in: [types/mcpTypes.ts:97](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L97)

---

### env?

> `optional` **env**: `Record`\<`string`, `string`\>

Defined in: [types/mcpTypes.ts:98](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L98)

---

### url?

> `optional` **url**: `string`

Defined in: [types/mcpTypes.ts:99](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L99)

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types/mcpTypes.ts:100](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L100)

---

### retries?

> `optional` **retries**: `number`

Defined in: [types/mcpTypes.ts:101](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L101)

---

### error?

> `optional` **error**: `string`

Defined in: [types/mcpTypes.ts:102](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L102)

---

### installed?

> `optional` **installed**: `boolean`

Defined in: [types/mcpTypes.ts:103](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L103)

---

### cwd?

> `optional` **cwd**: `string`

Defined in: [types/mcpTypes.ts:106](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L106)

---

### autoRestart?

> `optional` **autoRestart**: `boolean`

Defined in: [types/mcpTypes.ts:107](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L107)

---

### healthCheckInterval?

> `optional` **healthCheckInterval**: `number`

Defined in: [types/mcpTypes.ts:108](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L108)

---

### blockedTools?

> `optional` **blockedTools**: `string`[]

Defined in: [types/mcpTypes.ts:111](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L111)

---

### metadata?

> `optional` **metadata**: `object`

Defined in: [types/mcpTypes.ts:114](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/mcpTypes.ts#L114)

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
