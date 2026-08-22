[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeRequestMetadata

# Type Alias: RuntimeRequestMetadata

> **RuntimeRequestMetadata** = `object`

Defined in: [types/proxy.ts:2088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2088)

Request metadata retained by the HTTP adapter for terminal error logging.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2089)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2090)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2091)

---

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2092)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2093)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2095)

---

### rejectForUpdate?

> `optional` **rejectForUpdate?**: `boolean`

Defined in: [types/proxy.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2097)

Admission decision captured before an updater drain can race the route.

---

### terminalErrorType?

> `optional` **terminalErrorType?**: `string`

Defined in: [types/proxy.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2098)

---

### terminalErrorCode?

> `optional` **terminalErrorCode?**: `string`

Defined in: [types/proxy.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2099)
