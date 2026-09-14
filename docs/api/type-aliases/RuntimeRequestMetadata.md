[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2473)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2475)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2476)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2478)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2479)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2481)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2482)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2483)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2484)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2485)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2486)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2487)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2489)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2490)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2493)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2497)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
