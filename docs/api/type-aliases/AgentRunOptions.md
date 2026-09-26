[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOptions

# Type Alias: AgentRunOptions

> **AgentRunOptions** = `object`

Options for one isolated agent run (`NeuroLink.runIsolatedAgent`).

## Properties

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Parent cancellation. When provided it MUST be honored: an aborted parent
stops research AND extraction cleanly, the outcome reports the run was
cancelled, and no ghost workers survive.

---

### overrides?

> `optional` **overrides?**: [`AgentRunOverrides`](AgentRunOverrides.md)

Per-run overrides (internal-caller knobs).

---

### toolContext?

> `optional` **toolContext?**: `Record`\<`string`, `unknown`\>

Set on the worker for EVERY tool call (merged into the worker's tool
context), including a caller-supplied `sessionId`; the run id is used
when no sessionId is supplied.

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Lifecycle event stream. Fire-and-forget.

#### Parameters

##### event

[`AgentRunEvent`](AgentRunEvent.md)

#### Returns

`void`

---

### leg?

> `optional` **leg?**: [`AgentLegOptions`](AgentLegOptions.md)

Leg budget — enables leashed mode.

---

### handleTtlMs?

> `optional` **handleTtlMs?**: `number`

TTL for a leashed handle in ms (default 600_000 = 10 min).

---

### waste?

> `optional` **waste?**: [`AgentWasteThresholds`](AgentWasteThresholds.md)

Waste-signature thresholds (defaults apply when omitted).

---

### capture?

> `optional` **capture?**: `object`

Bounds for the run's tool execution records. Raise `maxResultChars`
when the CALLER verifies evidence from `toolExecutions` (raw result
texts must be available up to the cap).

#### maxResultChars?

> `optional` **maxResultChars?**: `number`

#### maxRecords?

> `optional` **maxRecords?**: `number`
