[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionRecord

# Type Alias: ToolExecutionRecord

> **ToolExecutionRecord** = `object`

Defined in: [types/generate.ts:935](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L935)

One real tool invocation captured during an agentic turn.

Replaces the historical `{name, input, output}` stub on `GenerateResult`:
every record is produced at the actual execution site (AI-SDK loop and the
native Gemini/Anthropic loops alike), so `params`, timing, and error status
reflect what really ran — consumers no longer need proxy "recorder" tools
to observe their own tool traffic.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/generate.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L937)

Tool name as the model called it.

---

### params

> **params**: `unknown`

Defined in: [types/generate.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L939)

Parameters the tool was invoked with, as parsed by the loop.

---

### resultText

> **resultText**: `string`

Defined in: [types/generate.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L945)

Serialized tool result (JSON when serializable, else String()), bounded
by `toolExecutionCapture.maxResultChars` (default ~8KB). Truncated text
ends with a `…[truncated N chars]` marker.

---

### isError

> **isError**: `boolean`

Defined in: [types/generate.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L947)

True when the execution threw or returned an error-shaped result.

---

### startedAt

> **startedAt**: `number`

Defined in: [types/generate.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L949)

Epoch milliseconds when the execution started.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/generate.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L951)

Wall-clock duration of the execution in milliseconds.
