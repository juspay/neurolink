[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTelemetryArgs

# Type Alias: ProxyTelemetryArgs

> **ProxyTelemetryArgs** = `object`

Arguments accepted by `neurolink proxy telemetry <subcommand>`

## Properties

### action?

> `optional` **action?**: `"setup"` \| `"start"` \| `"stop"` \| `"status"` \| `"logs"` \| `"import-dashboard"` \| `"doctor"` \| `"query"`

---

### quiet?

> `optional` **quiet?**: `boolean`

---

### since?

> `optional` **since?**: `string`

---

### until?

> `optional` **until?**: `string`

---

### kind?

> `optional` **kind?**: `string`

---

### format?

> `optional` **format?**: `"json"` \| `"text"`

---

### maxRows?

> `optional` **maxRows?**: `number`

---

### proxyUrl?

> `optional` **proxyUrl?**: `string`

---

### admissionLookbackMinutes?

> `optional` **admissionLookbackMinutes?**: `number`

---

### requestTimeoutMs?

> `optional` **requestTimeoutMs?**: `number`

---

### ingestionGraceMs?

> `optional` **ingestionGraceMs?**: `number`
