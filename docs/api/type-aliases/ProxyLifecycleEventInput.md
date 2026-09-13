[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1997)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1998)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1999)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2000)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2001)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2002)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2003)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2004)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2005)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2006)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:2007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2007)

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Defined in: [types/proxy.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2009)

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Defined in: [types/proxy.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2011)

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Defined in: [types/proxy.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2013)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

Defined in: [types/proxy.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2014)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2020)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:2021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2021)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:2022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2022)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:2023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2023)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2024)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2025)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2026)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:2027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2027)

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Defined in: [types/proxy.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2029)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)

Defined in: [types/proxy.ts:2030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2030)
