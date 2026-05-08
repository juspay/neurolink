[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureSTTOptions

# Type Alias: AzureSTTOptions

> **AzureSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stt.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L281)

## Type Declaration

### recognitionMode?

> `optional` **recognitionMode?**: [`AzureRecognitionMode`](AzureRecognitionMode.md)

### outputFormat?

> `optional` **outputFormat?**: [`AzureOutputFormat`](AzureOutputFormat.md)

### interimResults?

> `optional` **interimResults?**: `boolean`

### endpointId?

> `optional` **endpointId?**: `string`

### customEndpointId?

> `optional` **customEndpointId?**: `string`

Custom endpoint ID (alias for endpointId)

### connectionTimeout?

> `optional` **connectionTimeout?**: `number`

### silenceTimeout?

> `optional` **silenceTimeout?**: `number`

### profanityOption?

> `optional` **profanityOption?**: `"masked"` \| `"removed"` \| `"raw"`

### profanityMode?

> `optional` **profanityMode?**: `"masked"` \| `"removed"` \| `"raw"`

Profanity mode (alias for profanityOption)

### initialSilenceTimeout?

> `optional` **initialSilenceTimeout?**: `number`

### enableLogging?

> `optional` **enableLogging?**: `boolean`

### phraseList?

> `optional` **phraseList?**: `string`[]

### detailed?

> `optional` **detailed?**: `boolean`

Whether to request detailed output format

### wordLevelConfidence?

> `optional` **wordLevelConfidence?**: `boolean`

### initialSilenceTimeoutMs?

> `optional` **initialSilenceTimeoutMs?**: `number`

### endSilenceTimeoutMs?

> `optional` **endSilenceTimeoutMs?**: `number`
