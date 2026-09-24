[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2292)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2294)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2296)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2297)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2299)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2301)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2302)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2303)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2304)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2305)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2306)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2307)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2308)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2309)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2314)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2316)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2317)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2323)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2324)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2325)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2326)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2327)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2328)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2329)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2330)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2332)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2333)
