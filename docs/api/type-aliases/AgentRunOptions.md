[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOptions

# Type Alias: AgentRunOptions

> **AgentRunOptions** = `object`

Defined in: [types/isolatedAgent.ts:238](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L238)

Options for one isolated agent run (`NeuroLink.runIsolatedAgent`).

## Properties

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/isolatedAgent.ts:244](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L244)

Parent cancellation. When provided it MUST be honored: an aborted parent
stops research AND extraction cleanly, the outcome reports the run was
cancelled, and no ghost workers survive.

---

### overrides?

> `optional` **overrides?**: [`AgentRunOverrides`](AgentRunOverrides.md)

Defined in: [types/isolatedAgent.ts:246](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L246)

Per-run overrides (internal-caller knobs).

---

### toolContext?

> `optional` **toolContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/isolatedAgent.ts:252](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L252)

Set on the worker for EVERY tool call (merged into the worker's tool
context), including a caller-supplied `sessionId`; the run id is used
when no sessionId is supplied.

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/isolatedAgent.ts:254](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L254)

Lifecycle event stream. Fire-and-forget.

#### Parameters

##### event

[`AgentRunEvent`](AgentRunEvent.md)

#### Returns

`void`

---

### leg?

> `optional` **leg?**: [`AgentLegOptions`](AgentLegOptions.md)

Defined in: [types/isolatedAgent.ts:256](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L256)

Leg budget — enables leashed mode.

---

### handleTtlMs?

> `optional` **handleTtlMs?**: `number`

Defined in: [types/isolatedAgent.ts:258](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L258)

TTL for a leashed handle in ms (default 600_000 = 10 min).

---

### waste?

> `optional` **waste?**: [`AgentWasteThresholds`](AgentWasteThresholds.md)

Defined in: [types/isolatedAgent.ts:260](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L260)

Waste-signature thresholds (defaults apply when omitted).

---

### capture?

> `optional` **capture?**: `object`

Defined in: [types/isolatedAgent.ts:266](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L266)

Bounds for the run's tool execution records. Raise `maxResultChars`
when the CALLER verifies evidence from `toolExecutions` (raw result
texts must be available up to the cap).

#### maxResultChars?

> `optional` **maxResultChars?**: `number`

#### maxRecords?

> `optional` **maxRecords?**: `number`
