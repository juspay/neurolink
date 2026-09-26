[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryDoctorOptions

# Type Alias: ProxyTelemetryDoctorOptions

> **ProxyTelemetryDoctorOptions** = `object`

## Properties

### backend

> **backend**: [`ProxyTelemetryBackend`](ProxyTelemetryBackend.md)

---

### startTime

> **startTime**: `number`

---

### endTime

> **endTime**: `number`

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

---

### maxRows?

> `optional` **maxRows?**: `number`

---

### admissionLookbackMs?

> `optional` **admissionLookbackMs?**: `number`

Explicit age-search horizon; older admissions are outside this proof.

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`
