[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2399)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2400)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2401)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2402)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2403)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2404)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2405)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2406)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2407)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2408)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2410)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2412)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2414)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2415)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2421)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2422)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2423)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2425)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2426)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2427)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2428)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)
