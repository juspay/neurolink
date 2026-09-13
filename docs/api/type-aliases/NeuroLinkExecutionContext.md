[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkExecutionContext

# Type Alias: NeuroLinkExecutionContext

> **NeuroLinkExecutionContext** = `object`

Defined in: [types/mcp.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L360)

Tool execution context - Rich context passed to every tool execution
Extracted from factory.ts for centralized type management
Following standard patterns for rich tool context

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/mcp.ts:362](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L362)

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/mcp.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L363)

---

### aiProvider?

> `optional` **aiProvider?**: `string`

Defined in: [types/mcp.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L366)

---

### modelId?

> `optional` **modelId?**: `string`

Defined in: [types/mcp.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L367)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/mcp.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L368)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/mcp.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L369)

---

### appId?

> `optional` **appId?**: `string`

Defined in: [types/mcp.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L372)

---

### clientId?

> `optional` **clientId?**: `string`

Defined in: [types/mcp.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L373)

---

### clientVersion?

> `optional` **clientVersion?**: `string`

Defined in: [types/mcp.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L374)

---

### organizationId?

> `optional` **organizationId?**: `string`

Defined in: [types/mcp.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L375)

---

### projectId?

> `optional` **projectId?**: `string`

Defined in: [types/mcp.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L376)

---

### environment?

> `optional` **environment?**: `string`

Defined in: [types/mcp.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L379)

---

### environmentType?

> `optional` **environmentType?**: `"development"` \| `"staging"` \| `"production"`

Defined in: [types/mcp.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L380)

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/mcp.ts:381](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L381)

---

### device?

> `optional` **device?**: `string`

Defined in: [types/mcp.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L382)

---

### browser?

> `optional` **browser?**: `string`

Defined in: [types/mcp.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L383)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/mcp.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L384)

---

### frameworkType?

> `optional` **frameworkType?**: `"react"` \| `"vue"` \| `"svelte"` \| `"next"` \| `"nuxt"` \| `"sveltekit"`

Defined in: [types/mcp.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L387)

---

### toolChain?

> `optional` **toolChain?**: `string`[]

Defined in: [types/mcp.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L390)

---

### parentToolId?

> `optional` **parentToolId?**: `string`

Defined in: [types/mcp.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L391)

---

### locale?

> `optional` **locale?**: `string`

Defined in: [types/mcp.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L394)

---

### timezone?

> `optional` **timezone?**: `string`

Defined in: [types/mcp.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L395)

---

### ipAddress?

> `optional` **ipAddress?**: `string`

Defined in: [types/mcp.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L396)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/mcp.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L399)

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/mcp.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L400)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/mcp.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L403)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/mcp.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L404)

---

### enableDemoMode?

> `optional` **enableDemoMode?**: `boolean`

Defined in: [types/mcp.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L405)

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"private"` \| `"organization"`

Defined in: [types/mcp.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L406)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:409](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L409)
