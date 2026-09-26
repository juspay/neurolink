[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionOptions

# Type Alias: ToolExecutionOptions

> **ToolExecutionOptions** = `object`

Tool execution options for enhanced control
Extracted from toolRegistry.ts for centralized type management

## Properties

### timeout?

> `optional` **timeout?**: `number`

Caller-specified execution timeout in milliseconds.
Used by executeTool() callers to override the default timeout for a
single invocation. Takes precedence over `timeoutMs` when both are set.

---

### retries?

> `optional` **retries?**: `number`

---

### context?

> `optional` **context?**: `unknown`

---

### preferredSource?

> `optional` **preferredSource?**: `string`

---

### fallbackEnabled?

> `optional` **fallbackEnabled?**: `boolean`

---

### validateBeforeExecution?

> `optional` **validateBeforeExecution?**: `boolean`

---

### ~~timeoutMs?~~

> `optional` **timeoutMs?**: `number`

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

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Ceiling on the WHOLE execution — every attempt plus the delays between
them. `timeout` bounds one attempt. Defaults to
`timeout * (maxRetries + 1)`, which is what the retry loop already spent,
so supplying nothing changes nothing.
