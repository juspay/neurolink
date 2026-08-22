[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceProviderConfig

# Type Alias: VoiceProviderConfig

> **VoiceProviderConfig** = `object`

Defined in: [types/voice.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L68)

Base voice provider configuration

## Properties

### name

> **name**: `string`

Defined in: [types/voice.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L70)

Provider identifier

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/voice.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L72)

API key or credentials

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/voice.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L74)

Custom endpoint URL

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/voice.ts:76](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L76)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/voice.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L78)

Maximum retries for failed requests

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/voice.ts:80](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/voice.ts#L80)

Provider-specific options
