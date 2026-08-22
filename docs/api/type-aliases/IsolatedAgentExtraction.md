[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IsolatedAgentExtraction

# Type Alias: IsolatedAgentExtraction

> **IsolatedAgentExtraction** = `object`

Defined in: [types/isolatedAgent.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L92)

Structured-extraction configuration for an isolated agent run.

The extraction pass always runs tools-off on its own timeout, fed from the
run's tool-execution records — so a research generate that died on a
provider error still extracts from the records instead of losing the run.

## Properties

### schema

> **schema**: `z.ZodSchema`

Defined in: [types/isolatedAgent.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L94)

Local validator (lenient — may carry defaults/catch). Required.

---

### wireSchema?

> `optional` **wireSchema?**: `z.ZodSchema`

Defined in: [types/isolatedAgent.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L99)

Provider-attached wire schema (strict: no defaults/catch, which many
providers reject in constrained decoding). Falls back to `schema`.

---

### shapeDoc?

> `optional` **shapeDoc?**: `string`

Defined in: [types/isolatedAgent.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L104)

Human/model-readable JSON shape description used in the extraction
prompt and in corrective retries alongside validation errors.

---

### coerce?

> `optional` **coerce?**: (`candidate`) => `unknown`

Defined in: [types/isolatedAgent.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L109)

Normalizer applied to every recovery candidate before validation
(e.g. wrap a bare top-level array into the expected envelope).

#### Parameters

##### candidate

`unknown`

#### Returns

`unknown`

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/isolatedAgent.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L111)

Corrective re-ask attempts after ladder failure (default 2).

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L116)

Per-attempt extraction timeout in ms (default 60_000). Never carved out
of the research budget.

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L124)

Phase-level deadline bounding ALL extraction attempts (ms). Defaults to
`(maxRetries + 1) × timeoutMs` — i.e. 180s at the defaults. Callers that
derive an outer tool-execution ceiling from the leg budget must add this
bound (plus the ~20s next-plan ask in leashed mode) on top of the
research budget.
