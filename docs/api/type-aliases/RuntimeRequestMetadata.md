[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2761)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2763)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2764)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2776)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2777)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2778)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2779)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2780)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2781)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2782)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2784)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2785)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2786)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2788)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
