[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2697)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2699)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2700)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2703)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2704)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2706)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2707)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2709)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2710)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2711)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2712)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2713)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2714)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2715)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2717)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2718)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2719)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2725)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
