[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2759)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2761)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2762)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2764)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2765)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2768)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2769)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2775)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2776)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2777)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2778)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2779)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2780)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2782)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2783)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2784)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2786)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
