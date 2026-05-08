[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolImplementation

# Type Alias: ToolImplementation

> **ToolImplementation** = `object`

Defined in: [types/tools.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L121)

Tool Implementation type for MCP tool registry
Extracted from toolRegistry.ts for centralized type management

## Properties

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/tools.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L122)

#### Parameters

##### params

`unknown`

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<`unknown`\> \| `unknown`

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tools.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L126)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/tools.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L127)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Defined in: [types/tools.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L128)

---

### category?

> `optional` **category?**: `string`

Defined in: [types/tools.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L129)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/tools.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L130)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L132)

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L133)
