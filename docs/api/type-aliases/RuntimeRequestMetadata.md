[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2505)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### lastUpstreamAttempt?

> `optional` **lastUpstreamAttempt?**: [`RequestAttemptLogEntry`](RequestAttemptLogEntry.md)

Defined in: [types/proxy.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2507)

Last dispatched attempt, retained until this HTTP request terminates.

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2508)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:2510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2510)

Ingress OTel correlation survives detached stream/error callbacks.

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:2511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2511)

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:2513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2513)

Original OTel sampling flags retained through deferred logging.

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2514)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2515)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2516)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2517)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2518)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2519)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2521)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2522)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2523)

---

### terminalResult?

> `optional` **terminalResult?**: [`RequestLogEntry`](RequestLogEntry.md)

Defined in: [types/proxy.ts:2525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2525)

Canonical final record, populated synchronously before asynchronous I/O.

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
