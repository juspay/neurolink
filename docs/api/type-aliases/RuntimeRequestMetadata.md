[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2192)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2194)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2195)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2196)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2197)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2199)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2201)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
