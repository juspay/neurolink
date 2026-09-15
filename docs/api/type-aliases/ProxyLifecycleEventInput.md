[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2103)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2104)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2106)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2107)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2108)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2109)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2110)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2111)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2112)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2113)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2115)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2117)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2119)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2120)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2127)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2128)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2130)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2131)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2132)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2133)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2135)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)
