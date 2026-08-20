[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2095)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2096)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2097)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2098)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2099)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2100)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2101)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2103)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2104)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

---

### shareRelease?

> `optional` **shareRelease?**: () => `void`

Defined in: [types/proxy.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2109)

Releases this request's peer-share concurrency slot. Set by the share
gate for borrowed traffic; invoked once the response body completes, so a
long stream holds its slot for as long as it is actually streaming.

#### Returns

`void`
