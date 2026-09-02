[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2183)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2185)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2186)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2187)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2188)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2189)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2190)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2192)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2194)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
