[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseVoiceOptions

# Type Alias: UseVoiceOptions

> **UseVoiceOptions** = `object`

useVoice hook options

## Properties

### voice?

> `optional` **voice?**: `string`

Voice for TTS

---

### language?

> `optional` **language?**: `string`

Language

---

### autoPlay?

> `optional` **autoPlay?**: `boolean`

Auto-play responses

---

### onSpeechStart?

> `optional` **onSpeechStart?**: () => `void`

Called when speech starts

#### Returns

`void`

---

### onSpeechEnd?

> `optional` **onSpeechEnd?**: () => `void`

Called when speech ends

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Called on error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### api?

> `optional` **api?**: `string`

API endpoint for voice

---

### enableSpeechRecognition?

> `optional` **enableSpeechRecognition?**: `boolean`

Enable speech recognition
