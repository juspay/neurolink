[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionCaptureOptions

# Type Alias: ToolExecutionCaptureOptions

> **ToolExecutionCaptureOptions** = `object`

Defined in: [types/generate.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L951)

Bounds for per-call tool execution capture (see `ToolExecutionRecord`).
Capture is ON by default with these caps; raise them when a caller needs
full result texts (e.g. caller-side evidence verification).

## Properties

### maxResultChars?

> `optional` **maxResultChars?**: `number`

Defined in: [types/generate.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L953)

Max serialized result characters kept per record (default 8192).

---

### maxRecords?

> `optional` **maxRecords?**: `number`

Defined in: [types/generate.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L955)

Max records kept per turn; oldest are dropped first (default 500).

---

### onRecord?

> `optional` **onRecord?**: (`record`) => `void` \| `Promise`\<`void`\>

Defined in: [types/generate.ts:963](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L963)

Fire-and-forget per-record callback, invoked as each tool execution
completes. Listener errors — synchronous throws AND async rejections —
are swallowed; they never break the turn. Used by supervisors (e.g. the
isolated-agent runner's waste detection) and callers that stream
evidence as it is gathered.

#### Parameters

##### record

[`ToolExecutionRecord`](ToolExecutionRecord.md)

#### Returns

`void` \| `Promise`\<`void`\>
