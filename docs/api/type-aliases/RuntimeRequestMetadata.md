[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2199)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2200)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2201)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2204)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2209)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2213)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
