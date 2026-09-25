[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

Defined in: [types/proxy.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1039)

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

Defined in: [types/proxy.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1040)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1041)

---

### endTime

> **endTime**: `number`

Defined in: [types/proxy.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1042)

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

Defined in: [types/proxy.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1043)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/proxy.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1044)

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Defined in: [types/proxy.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1046)

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1047)

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

Defined in: [types/proxy.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1048)

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1049)
