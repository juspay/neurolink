[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkExecutionContext

# Type Alias: NeuroLinkExecutionContext

> **NeuroLinkExecutionContext** = `object`

Defined in: [types/mcp.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L341)

Tool execution context - Rich context passed to every tool execution
Extracted from factory.ts for centralized type management
Following standard patterns for rich tool context

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/mcp.ts:343](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L343)

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/mcp.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L344)

---

### aiProvider?

> `optional` **aiProvider?**: `string`

Defined in: [types/mcp.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L347)

---

### modelId?

> `optional` **modelId?**: `string`

Defined in: [types/mcp.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L348)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/mcp.ts:349](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L349)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/mcp.ts:350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L350)

---

### appId?

> `optional` **appId?**: `string`

Defined in: [types/mcp.ts:353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L353)

---

### clientId?

> `optional` **clientId?**: `string`

Defined in: [types/mcp.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L354)

---

### clientVersion?

> `optional` **clientVersion?**: `string`

Defined in: [types/mcp.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L355)

---

### organizationId?

> `optional` **organizationId?**: `string`

Defined in: [types/mcp.ts:356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L356)

---

### projectId?

> `optional` **projectId?**: `string`

Defined in: [types/mcp.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L357)

---

### environment?

> `optional` **environment?**: `string`

Defined in: [types/mcp.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L360)

---

### environmentType?

> `optional` **environmentType?**: `"development"` \| `"staging"` \| `"production"`

Defined in: [types/mcp.ts:361](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L361)

---

### platform?

> `optional` **platform?**: `string`

Defined in: [types/mcp.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L362)

---

### device?

> `optional` **device?**: `string`

Defined in: [types/mcp.ts:363](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L363)

---

### browser?

> `optional` **browser?**: `string`

Defined in: [types/mcp.ts:364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L364)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/mcp.ts:365](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L365)

---

### frameworkType?

> `optional` **frameworkType?**: `"react"` \| `"vue"` \| `"svelte"` \| `"next"` \| `"nuxt"` \| `"sveltekit"`

Defined in: [types/mcp.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L368)

---

### toolChain?

> `optional` **toolChain?**: `string`[]

Defined in: [types/mcp.ts:371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L371)

---

### parentToolId?

> `optional` **parentToolId?**: `string`

Defined in: [types/mcp.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L372)

---

### locale?

> `optional` **locale?**: `string`

Defined in: [types/mcp.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L375)

---

### timezone?

> `optional` **timezone?**: `string`

Defined in: [types/mcp.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L376)

---

### ipAddress?

> `optional` **ipAddress?**: `string`

Defined in: [types/mcp.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L377)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/mcp.ts:380](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L380)

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/mcp.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L381)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/mcp.ts:384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L384)

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/mcp.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L385)

---

### enableDemoMode?

> `optional` **enableDemoMode?**: `boolean`

Defined in: [types/mcp.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L386)

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"private"` \| `"organization"`

Defined in: [types/mcp.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L387)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L390)
