[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolImplementation

# Type Alias: ToolImplementation

> **ToolImplementation** = `object`

Defined in: [types/tools.ts:138](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L138)

Tool Implementation type for MCP tool registry
Extracted from toolRegistry.ts for centralized type management

## Properties

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/tools.ts:139](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L139)

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

Defined in: [types/tools.ts:143](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L143)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/tools.ts:144](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L144)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Defined in: [types/tools.ts:145](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L145)

---

### category?

> `optional` **category?**: `string`

Defined in: [types/tools.ts:146](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L146)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/tools.ts:147](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L147)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:149](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L149)

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:150](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tools.ts#L150)
