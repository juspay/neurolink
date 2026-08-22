[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionOptions

# Type Alias: ToolExecutionOptions

> **ToolExecutionOptions** = `object`

Defined in: [types/tools.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L157)

Tool execution options for enhanced control
Extracted from toolRegistry.ts for centralized type management

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/tools.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L163)

Caller-specified execution timeout in milliseconds.
Used by executeTool() callers to override the default timeout for a
single invocation. Takes precedence over `timeoutMs` when both are set.

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/tools.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L164)

---

### context?

> `optional` **context?**: `unknown`

Defined in: [types/tools.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L165)

---

### preferredSource?

> `optional` **preferredSource?**: `string`

Defined in: [types/tools.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L166)

---

### fallbackEnabled?

> `optional` **fallbackEnabled?**: `boolean`

Defined in: [types/tools.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L167)

---

### validateBeforeExecution?

> `optional` **validateBeforeExecution?**: `boolean`

Defined in: [types/tools.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L168)

---

### ~~timeoutMs?~~

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L177)

Per-tool timeout in milliseconds, copied from ToolInfo at registration
time. Acts as the tool-level default; overridden by `timeout` when the
caller supplies an explicit value.

#### Deprecated

Prefer using `timeout` for caller-specified overrides.
This field exists for internal forwarding from ToolInfo and
may be consolidated in a future release.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L178)
