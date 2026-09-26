[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2366)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2368)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2370)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2372)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2373)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2374)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2375)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2376)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2377)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2379)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2381)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2383)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2384)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2391)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2393)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2396)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2399)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2400)
