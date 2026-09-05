[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2204)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2206)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2209)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2210)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2211)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2213)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2214)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2215)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2219)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
