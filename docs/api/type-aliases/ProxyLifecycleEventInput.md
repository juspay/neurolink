[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2269)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2271)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2273)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2274)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2276)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2278)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2279)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2280)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2281)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2282)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2283)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2284)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2285)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2286)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2287)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2289)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2291)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2293)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2294)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2300)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2301)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2302)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2303)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2304)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2305)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2306)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2307)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2309)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)
