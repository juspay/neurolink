[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IsolatedAgentExtraction

# Type Alias: IsolatedAgentExtraction

> **IsolatedAgentExtraction** = `object`

Structured-extraction configuration for an isolated agent run.

The extraction pass always runs tools-off on its own timeout, fed from the
run's tool-execution records — so a research generate that died on a
provider error still extracts from the records instead of losing the run.

## Properties

### schema

> **schema**: `z.ZodSchema`

Local validator (lenient — may carry defaults/catch). Required.

---

### wireSchema?

> `optional` **wireSchema?**: `z.ZodSchema`

Provider-attached wire schema (strict: no defaults/catch, which many
providers reject in constrained decoding). Falls back to `schema`.

---

### shapeDoc?

> `optional` **shapeDoc?**: `string`

Human/model-readable JSON shape description used in the extraction
prompt and in corrective retries alongside validation errors.

---

### coerce?

> `optional` **coerce?**: (`candidate`) => `unknown`

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

Corrective re-ask attempts after ladder failure (default 2).

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-attempt extraction timeout in ms (default 60_000). Never carved out
of the research budget.

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Phase-level deadline bounding ALL extraction attempts (ms). Defaults to
`(maxRetries + 1) × timeoutMs` — i.e. 180s at the defaults. Callers that
derive an outer tool-execution ceiling from the leg budget must add this
bound (plus the ~20s next-plan ask in leashed mode) on top of the
research budget.
