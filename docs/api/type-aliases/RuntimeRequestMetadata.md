[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2484)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2486)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2487)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2489)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2490)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2492)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2493)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2494)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2495)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2496)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2497)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2498)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2500)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2501)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2502)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2504)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2508)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
