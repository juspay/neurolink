[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2671)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2673)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2674)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2681)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2683)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2684)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2687)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2688)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2689)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2690)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2691)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2692)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2695)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2698)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2702)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
