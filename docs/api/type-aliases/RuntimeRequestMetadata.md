[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2811)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2813)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2814)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2816)

Exactly this request owns usage; bridge parents never duplicate it.

---

### abortController?

> `optional` **abortController?**: `AbortController`

Defined in: [types/proxy.ts:2817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2817)

---

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2820)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2821)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2823)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2824)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2826)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2827)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2828)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2829)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2830)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2831)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2832)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2834)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2835)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2836)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2838)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2842)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
