[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2096)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2097)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2098)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2099)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2100)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2101)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2102)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2103)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2104)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2106)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2108)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2110)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2112)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2113)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2119)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2120)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2121)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2122)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2123)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2124)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2125)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2128)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)
