[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

Defined in: [types/proxy.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1048)

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

Defined in: [types/proxy.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1049)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1050)

---

### endTime

> **endTime**: `number`

Defined in: [types/proxy.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1051)

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

Defined in: [types/proxy.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1052)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/proxy.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1053)

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Defined in: [types/proxy.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1055)

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1056)

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

Defined in: [types/proxy.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1057)

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1058)
