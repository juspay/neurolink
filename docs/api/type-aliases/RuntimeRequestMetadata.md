[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

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

### abortController?

> `optional` **abortController?**: `AbortController`

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

---

### traceId?

> `optional` **traceId?**: `string`

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

---

### path

> **path**: `string`

---

### startedAt

> **startedAt**: `number`

---

### model

> **model**: `string`

---

### stream

> **stream**: `boolean`

---

### toolCount

> **toolCount**: `number`

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
