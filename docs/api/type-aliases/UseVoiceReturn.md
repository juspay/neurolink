[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseVoiceReturn

# Type Alias: UseVoiceReturn

> **UseVoiceReturn** = `object`

useVoice hook return type

## Properties

### startListening

> **startListening**: () => `void`

Start listening for voice input

#### Returns

`void`

---

### stopListening

> **stopListening**: () => `void`

Stop listening

#### Returns

`void`

---

### speak

> **speak**: (`text`) => `Promise`\<`void`\>

Speak text

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### stopSpeaking

> **stopSpeaking**: () => `void`

Stop speaking

#### Returns

`void`

---

### submit

> **submit**: (`text`) => `Promise`\<`string`\>

Submit voice input

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`string`\>

---

### isListening

> **isListening**: `boolean`

Whether currently listening

---

### isSpeaking

> **isSpeaking**: `boolean`

Whether currently speaking

---

### isProcessing

> **isProcessing**: `boolean`

Whether processing

---

### transcript

> **transcript**: `string`

Current transcript

---

### response

> **response**: `string` \| `null`

Last response

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Error state

---

### isSupported

> **isSupported**: `boolean`

Supported by browser
