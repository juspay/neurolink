[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionOptions

# Type Alias: ToolExecutionOptions

> **ToolExecutionOptions** = `object`

Defined in: [types/tools.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L170)

Tool execution options for enhanced control
Extracted from toolRegistry.ts for centralized type management

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/tools.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L176)

Caller-specified execution timeout in milliseconds.
Used by executeTool() callers to override the default timeout for a
single invocation. Takes precedence over `timeoutMs` when both are set.

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/tools.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L177)

---

### context?

> `optional` **context?**: `unknown`

Defined in: [types/tools.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L178)

---

### preferredSource?

> `optional` **preferredSource?**: `string`

Defined in: [types/tools.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L179)

---

### fallbackEnabled?

> `optional` **fallbackEnabled?**: `boolean`

Defined in: [types/tools.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L180)

---

### validateBeforeExecution?

> `optional` **validateBeforeExecution?**: `boolean`

Defined in: [types/tools.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L181)

---

### ~~timeoutMs?~~

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L190)

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

Defined in: [types/tools.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L191)

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Defined in: [types/tools.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L198)

Ceiling on the WHOLE execution — every attempt plus the delays between
them. `timeout` bounds one attempt. Defaults to
`timeout * (maxRetries + 1)`, which is what the retry loop already spent,
so supplying nothing changes nothing.
