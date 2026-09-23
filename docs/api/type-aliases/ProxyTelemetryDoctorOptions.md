[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

Defined in: [types/proxy.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L987)

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

Defined in: [types/proxy.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L988)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L989)

---

### endTime

> **endTime**: `number`

Defined in: [types/proxy.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L990)

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

Defined in: [types/proxy.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L991)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/proxy.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L992)

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L997)
