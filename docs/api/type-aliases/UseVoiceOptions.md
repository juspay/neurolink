[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseVoiceOptions

# Type Alias: UseVoiceOptions

> **UseVoiceOptions** = `object`

Defined in: [types/client.ts:724](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L724)

useVoice hook options

## Properties

### voice?

> `optional` **voice?**: `string`

Defined in: [types/client.ts:726](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L726)

Voice for TTS

---

### language?

> `optional` **language?**: `string`

Defined in: [types/client.ts:728](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L728)

Language

---

### autoPlay?

> `optional` **autoPlay?**: `boolean`

Defined in: [types/client.ts:730](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L730)

Auto-play responses

---

### onSpeechStart?

> `optional` **onSpeechStart?**: () => `void`

Defined in: [types/client.ts:732](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L732)

Called when speech starts

#### Returns

`void`

---

### onSpeechEnd?

> `optional` **onSpeechEnd?**: () => `void`

Defined in: [types/client.ts:734](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L734)

Called when speech ends

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:736](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L736)

Called on error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### api?

> `optional` **api?**: `string`

Defined in: [types/client.ts:738](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L738)

API endpoint for voice

---

### enableSpeechRecognition?

> `optional` **enableSpeechRecognition?**: `boolean`

Defined in: [types/client.ts:740](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L740)

Enable speech recognition
