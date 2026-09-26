[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientProviderStatus

# Type Alias: ClientProviderStatus

> **ClientProviderStatus** = `object`

Provider status information

## Properties

### name

> **name**: `string`

Provider name

---

### status

> **status**: `"available"` \| `"degraded"` \| `"unavailable"`

Provider availability status

---

### models

> **models**: `string`[]

Available models for this provider

---

### capabilities?

> `optional` **capabilities?**: `object`

Provider capabilities

#### streaming

> **streaming**: `boolean`

#### tools

> **tools**: `boolean`

#### vision

> **vision**: `boolean`

#### audio

> **audio**: `boolean`

---

### lastChecked?

> `optional` **lastChecked?**: `number`

Last health check timestamp
