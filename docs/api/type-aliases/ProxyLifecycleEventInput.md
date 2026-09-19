[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2218)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2220)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2222)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2223)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2227)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2228)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2229)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2230)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2231)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2232)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2233)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2235)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2236)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2238)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2240)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2242)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2243)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2249)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2250)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2251)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2252)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2253)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2254)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2255)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2256)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2258)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2259)
