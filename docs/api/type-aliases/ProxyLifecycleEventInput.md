[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Hard admission-to-terminal deadline used by reconciliation.

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Exactly this request owns usage; bridge parents never duplicate it.

---

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

---

### requestId

> **requestId**: `string`

---

### method

> **method**: `string`

---

### path

> **path**: `string`

---

### model?

> `optional` **model?**: `string`

---

### stream?

> `optional` **stream?**: `boolean`

---

### toolCount?

> `optional` **toolCount?**: `number`

---

### sessionHash?

> `optional` **sessionHash?**: `string`

---

### requestBytes?

> `optional` **requestBytes?**: `number`

---

### responseStatus?

> `optional` **responseStatus?**: `number`

---

### finalStatus?

> `optional` **finalStatus?**: `number`

Semantic final status; the HTTP status may already have been committed.

---

### telemetryStatus?

> `optional` **telemetryStatus?**: `"complete"` \| `"timeout"` \| `"observer_error"` \| `"missing_final"`

Terminal bookkeeping health, separate from the model outcome.

---

### transportOutcome?

> `optional` **transportOutcome?**: [`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

Transport completion is independent of successful model completion.

---

### outcomeSource?

> `optional` **outcomeSource?**: `"final_request"` \| `"transport_error"` \| `"http_status"` \| `"unknown"`

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

---

### errorType?

> `optional` **errorType?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

---

### timestampMs?

> `optional` **timestampMs?**: `number`

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

---

### supervisorEvent?

> `optional` **supervisorEvent?**: [`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

Parent-owned evidence, independent of the serving worker's journal tail.

---

### runtimeSample?

> `optional` **runtimeSample?**: [`ProxyRuntimeSample`](ProxyRuntimeSample.md)
