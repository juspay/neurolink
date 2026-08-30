[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2162)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2171)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2176)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
