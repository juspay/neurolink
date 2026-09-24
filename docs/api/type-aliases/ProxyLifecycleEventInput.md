[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2380)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2382)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2384)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2385)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2387)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2389)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2391)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2393)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2396)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2398)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2400)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2402)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2404)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2405)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2411)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2412)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2413)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2414)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2415)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2416)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2417)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2421)
