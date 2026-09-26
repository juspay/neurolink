[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingDecision

# Type Alias: ToolRoutingDecision

> **ToolRoutingDecision** = `object`

Machine-readable summary of one routing resolution. Emitted via the
`emitDecision` callback so the caller can attach it as OTel span attributes
or record it in any other telemetry sink.

## Properties

### outcome

> **outcome**: [`ToolRoutingOutcome`](ToolRoutingOutcome.md)

How the routing turn concluded.

---

### selectedServerIds

> **selectedServerIds**: `string`[]

Server ids the router kept (selected as relevant).

---

### excludedServerIds

> **excludedServerIds**: `string`[]

Server ids whose tools were excluded (router considered them irrelevant).

---

### hallucinatedIds

> **hallucinatedIds**: `string`[]

Server ids the router returned that did not exist in the catalog.

---

### excludedToolCount

> **excludedToolCount**: `number`

Total number of individual tool names added to the exclusion list.

---

### routableServerCount

> **routableServerCount**: `number`

Number of servers that were offered to the router (always-include excluded).

---

### cacheHit

> **cacheHit**: `boolean`

True when the result was served from cache, skipping the router LLM.

---

### durationMs

> **durationMs**: `number`

Wall-clock time spent in the routing resolution in milliseconds.

---

### embeddingActivated?

> `optional` **embeddingActivated?**: `boolean`

True when the L2 embedding fast-path ran and produced candidate results.

---

### candidateToolCount?

> `optional` **candidateToolCount?**: `number`

Number of tool candidates produced by the embedding retriever before the
post-embedding server or tool filtering step.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Granularity at which exclusions were applied ("server" or "tool").
Matches `ToolRoutingConfig.granularity`; present only when routing was
applied (outcome === "applied").

---

### strategy?

> `optional` **strategy?**: `"decision"` \| `"embedding"` \| `"llm"`

Which strategy produced this decision. Absent on skip/fail-open paths that
never reached one. "decision" is the calibrated per-server router,
"embedding" the L2 retriever, "llm" the generative router.
