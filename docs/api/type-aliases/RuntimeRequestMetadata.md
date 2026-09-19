[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2620)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2622)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2623)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2629)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2630)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2632)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2633)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2636)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2637)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2638)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2639)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2643)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2644)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2645)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2647)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2651)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
