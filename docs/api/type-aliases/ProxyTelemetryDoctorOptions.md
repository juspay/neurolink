[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

Defined in: [types/proxy.ts:917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L917)

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

Defined in: [types/proxy.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L918)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L919)

---

### endTime

> **endTime**: `number`

Defined in: [types/proxy.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L920)

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

Defined in: [types/proxy.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L921)

---

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Defined in: [types/proxy.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L924)

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

Defined in: [types/proxy.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L925)

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

Defined in: [types/proxy.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L926)

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L927)
