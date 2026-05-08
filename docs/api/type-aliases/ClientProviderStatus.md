[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientProviderStatus

# Type Alias: ClientProviderStatus

> **ClientProviderStatus** = `object`

Defined in: [types/client.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L116)

Provider status information

## Properties

### name

> **name**: `string`

Defined in: [types/client.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L118)

Provider name

---

### status

> **status**: `"available"` \| `"degraded"` \| `"unavailable"`

Defined in: [types/client.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L120)

Provider availability status

---

### models

> **models**: `string`[]

Defined in: [types/client.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L122)

Available models for this provider

---

### capabilities?

> `optional` **capabilities?**: `object`

Defined in: [types/client.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L124)

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

Defined in: [types/client.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L131)

Last health check timestamp
