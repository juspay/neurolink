[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOptions

# Type Alias: AgentRunOptions

> **AgentRunOptions** = `object`

Defined in: [types/isolatedAgent.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L247)

Options for one isolated agent run (`NeuroLink.runIsolatedAgent`).

## Properties

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/isolatedAgent.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L253)

Parent cancellation. When provided it MUST be honored: an aborted parent
stops research AND extraction cleanly, the outcome reports the run was
cancelled, and no ghost workers survive.

---

### overrides?

> `optional` **overrides?**: [`AgentRunOverrides`](AgentRunOverrides.md)

Defined in: [types/isolatedAgent.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L255)

Per-run overrides (internal-caller knobs).

---

### toolContext?

> `optional` **toolContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/isolatedAgent.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L261)

Set on the worker for EVERY tool call (merged into the worker's tool
context), including a caller-supplied `sessionId`; the run id is used
when no sessionId is supplied.

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/isolatedAgent.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L263)

Lifecycle event stream. Fire-and-forget.

#### Parameters

##### event

[`AgentRunEvent`](AgentRunEvent.md)

#### Returns

`void`

---

### leg?

> `optional` **leg?**: [`AgentLegOptions`](AgentLegOptions.md)

Defined in: [types/isolatedAgent.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L265)

Leg budget — enables leashed mode.

---

### handleTtlMs?

> `optional` **handleTtlMs?**: `number`

Defined in: [types/isolatedAgent.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L267)

TTL for a leashed handle in ms (default 600_000 = 10 min).

---

### waste?

> `optional` **waste?**: [`AgentWasteThresholds`](AgentWasteThresholds.md)

Defined in: [types/isolatedAgent.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L269)

Waste-signature thresholds (defaults apply when omitted).

---

### capture?

> `optional` **capture?**: `object`

Defined in: [types/isolatedAgent.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L275)

Bounds for the run's tool execution records. Raise `maxResultChars`
when the CALLER verifies evidence from `toolExecutions` (raw result
texts must be available up to the cap).

#### maxResultChars?

> `optional` **maxResultChars?**: `number`

#### maxRecords?

> `optional` **maxRecords?**: `number`
