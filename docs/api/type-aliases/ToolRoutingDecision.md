[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingDecision

# Type Alias: ToolRoutingDecision

> **ToolRoutingDecision** = `object`

Defined in: [types/toolRouting.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L241)

Machine-readable summary of one routing resolution. Emitted via the
`emitDecision` callback so the caller can attach it as OTel span attributes
or record it in any other telemetry sink.

## Properties

### outcome

> **outcome**: [`ToolRoutingOutcome`](ToolRoutingOutcome.md)

Defined in: [types/toolRouting.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L243)

How the routing turn concluded.

---

### selectedServerIds

> **selectedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L245)

Server ids the router kept (selected as relevant).

---

### excludedServerIds

> **excludedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L247)

Server ids whose tools were excluded (router considered them irrelevant).

---

### hallucinatedIds

> **hallucinatedIds**: `string`[]

Defined in: [types/toolRouting.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L249)

Server ids the router returned that did not exist in the catalog.

---

### excludedToolCount

> **excludedToolCount**: `number`

Defined in: [types/toolRouting.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L251)

Total number of individual tool names added to the exclusion list.

---

### routableServerCount

> **routableServerCount**: `number`

Defined in: [types/toolRouting.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L253)

Number of servers that were offered to the router (always-include excluded).

---

### cacheHit

> **cacheHit**: `boolean`

Defined in: [types/toolRouting.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L255)

True when the result was served from cache, skipping the router LLM.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/toolRouting.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L257)

Wall-clock time spent in the routing resolution in milliseconds.

---

### embeddingActivated?

> `optional` **embeddingActivated?**: `boolean`

Defined in: [types/toolRouting.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L263)

True when the L2 embedding fast-path ran and produced candidate results.

---

### candidateToolCount?

> `optional` **candidateToolCount?**: `number`

Defined in: [types/toolRouting.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L268)

Number of tool candidates produced by the embedding retriever before the
post-embedding server or tool filtering step.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Defined in: [types/toolRouting.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L274)

Granularity at which exclusions were applied ("server" or "tool").
Matches `ToolRoutingConfig.granularity`; present only when routing was
applied (outcome === "applied").
