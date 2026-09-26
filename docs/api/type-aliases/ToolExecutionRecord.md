[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionRecord

# Type Alias: ToolExecutionRecord

> **ToolExecutionRecord** = `object`

One real tool invocation captured during an agentic turn.

Replaces the historical `{name, input, output}` stub on `GenerateResult`:
every record is produced at the actual execution site (AI-SDK loop and the
native Gemini/Anthropic loops alike), so `params`, timing, and error status
reflect what really ran — consumers no longer need proxy "recorder" tools
to observe their own tool traffic.

## Properties

### toolName

> **toolName**: `string`

Tool name as the model called it.

---

### params

> **params**: `unknown`

Parameters the tool was invoked with, as parsed by the loop.

---

### resultText

> **resultText**: `string`

Serialized tool result (JSON when serializable, else String()), bounded
by `toolExecutionCapture.maxResultChars` (default ~8KB). Truncated text
ends with a `…[truncated N chars]` marker.

---

### isError

> **isError**: `boolean`

True when the execution threw or returned an error-shaped result.

---

### startedAt

> **startedAt**: `number`

Epoch milliseconds when the execution started.

---

### durationMs

> **durationMs**: `number`

Wall-clock duration of the execution in milliseconds.
