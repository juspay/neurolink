[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionOptions

# Type Alias: ToolExecutionOptions

> **ToolExecutionOptions** = `object`

Defined in: [types/tools.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L140)

Tool execution options for enhanced control
Extracted from toolRegistry.ts for centralized type management

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/tools.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L146)

Caller-specified execution timeout in milliseconds.
Used by executeTool() callers to override the default timeout for a
single invocation. Takes precedence over `timeoutMs` when both are set.

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/tools.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L147)

---

### context?

> `optional` **context?**: `unknown`

Defined in: [types/tools.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L148)

---

### preferredSource?

> `optional` **preferredSource?**: `string`

Defined in: [types/tools.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L149)

---

### fallbackEnabled?

> `optional` **fallbackEnabled?**: `boolean`

Defined in: [types/tools.ts:150](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L150)

---

### validateBeforeExecution?

> `optional` **validateBeforeExecution?**: `boolean`

Defined in: [types/tools.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L151)

---

### ~~timeoutMs?~~

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L160)

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

Defined in: [types/tools.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L161)
