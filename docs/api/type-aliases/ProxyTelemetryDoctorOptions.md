[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

Defined in: [types/proxy.ts:967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L967)

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

Defined in: [types/proxy.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L968)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L969)

---

### endTime

> **endTime**: `number`

Defined in: [types/proxy.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L970)

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

Defined in: [types/proxy.ts:971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L971)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/proxy.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L972)

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Defined in: [types/proxy.ts:974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L974)

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L975)

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

Defined in: [types/proxy.ts:976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L976)

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L977)
