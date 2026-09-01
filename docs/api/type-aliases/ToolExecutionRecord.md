[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionRecord

# Type Alias: ToolExecutionRecord

> **ToolExecutionRecord** = `object`

Defined in: [types/generate.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L851)

One real tool invocation captured during an agentic turn.

Replaces the historical `{name, input, output}` stub on `GenerateResult`:
every record is produced at the actual execution site (AI-SDK loop and the
native Gemini/Anthropic loops alike), so `params`, timing, and error status
reflect what really ran — consumers no longer need proxy "recorder" tools
to observe their own tool traffic.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/generate.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L853)

Tool name as the model called it.

---

### params

> **params**: `unknown`

Defined in: [types/generate.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L855)

Parameters the tool was invoked with, as parsed by the loop.

---

### resultText

> **resultText**: `string`

Defined in: [types/generate.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L861)

Serialized tool result (JSON when serializable, else String()), bounded
by `toolExecutionCapture.maxResultChars` (default ~8KB). Truncated text
ends with a `…[truncated N chars]` marker.

---

### isError

> **isError**: `boolean`

Defined in: [types/generate.ts:863](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L863)

True when the execution threw or returned an error-shaped result.

---

### startedAt

> **startedAt**: `number`

Defined in: [types/generate.ts:865](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L865)

Epoch milliseconds when the execution started.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/generate.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L867)

Wall-clock duration of the execution in milliseconds.
