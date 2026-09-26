[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkExecutionContext

# Type Alias: NeuroLinkExecutionContext

> **NeuroLinkExecutionContext** = `object`

Tool execution context - Rich context passed to every tool execution
Extracted from factory.ts for centralized type management
Following standard patterns for rich tool context

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

---

### userId?

> `optional` **userId?**: `string`

---

### aiProvider?

> `optional` **aiProvider?**: `string`

---

### modelId?

> `optional` **modelId?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### appId?

> `optional` **appId?**: `string`

---

### clientId?

> `optional` **clientId?**: `string`

---

### clientVersion?

> `optional` **clientVersion?**: `string`

---

### organizationId?

> `optional` **organizationId?**: `string`

---

### projectId?

> `optional` **projectId?**: `string`

---

### environment?

> `optional` **environment?**: `string`

---

### environmentType?

> `optional` **environmentType?**: `"development"` \| `"staging"` \| `"production"`

---

### platform?

> `optional` **platform?**: `string`

---

### device?

> `optional` **device?**: `string`

---

### browser?

> `optional` **browser?**: `string`

---

### userAgent?

> `optional` **userAgent?**: `string`

---

### frameworkType?

> `optional` **frameworkType?**: `"react"` \| `"vue"` \| `"svelte"` \| `"next"` \| `"nuxt"` \| `"sveltekit"`

---

### toolChain?

> `optional` **toolChain?**: `string`[]

---

### parentToolId?

> `optional` **parentToolId?**: `string`

---

### locale?

> `optional` **locale?**: `string`

---

### timezone?

> `optional` **timezone?**: `string`

---

### ipAddress?

> `optional` **ipAddress?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`

---

### timestamp?

> `optional` **timestamp?**: `number`

---

### permissions?

> `optional` **permissions?**: `string`[]

---

### features?

> `optional` **features?**: `string`[]

---

### enableDemoMode?

> `optional` **enableDemoMode?**: `boolean`

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"private"` \| `"organization"`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
