[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolImplementation

# Type Alias: ToolImplementation

> **ToolImplementation** = `object`

Defined in: [types/tools.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L144)

Tool Implementation type for MCP tool registry
Extracted from toolRegistry.ts for centralized type management

## Properties

### execute

> **execute**: (`params`, `context?`) => `Promise`\<`unknown`\> \| `unknown`

Defined in: [types/tools.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L145)

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

Defined in: [types/tools.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L149)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/tools.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L150)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Defined in: [types/tools.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L151)

---

### category?

> `optional` **category?**: `string`

Defined in: [types/tools.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L152)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/tools.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L153)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L155)

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L156)

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Defined in: [types/tools.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L163)

Ceiling on the WHOLE execution — every attempt plus the delays between
them — in milliseconds. `timeoutMs` bounds one attempt; without this, a
tool that reliably hangs burns `timeoutMs * (maxRetries + 1)`.
Defaults to exactly that product, so behaviour is unchanged unless set.
