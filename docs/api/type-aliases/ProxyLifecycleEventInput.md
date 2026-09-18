[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2122)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2123)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2124)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2125)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2127)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2128)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2130)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2131)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2132)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2134)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2146)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2147)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2149)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2150)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2152)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2154)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)
