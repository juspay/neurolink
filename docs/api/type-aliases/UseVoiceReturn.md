[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseVoiceReturn

# Type Alias: UseVoiceReturn

> **UseVoiceReturn** = `object`

Defined in: [types/client.ts:746](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L746)

useVoice hook return type

## Properties

### startListening

> **startListening**: () => `void`

Defined in: [types/client.ts:748](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L748)

Start listening for voice input

#### Returns

`void`

---

### stopListening

> **stopListening**: () => `void`

Defined in: [types/client.ts:750](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L750)

Stop listening

#### Returns

`void`

---

### speak

> **speak**: (`text`) => `Promise`\<`void`\>

Defined in: [types/client.ts:752](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L752)

Speak text

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### stopSpeaking

> **stopSpeaking**: () => `void`

Defined in: [types/client.ts:754](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L754)

Stop speaking

#### Returns

`void`

---

### submit

> **submit**: (`text`) => `Promise`\<`string`\>

Defined in: [types/client.ts:756](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L756)

Submit voice input

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`string`\>

---

### isListening

> **isListening**: `boolean`

Defined in: [types/client.ts:758](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L758)

Whether currently listening

---

### isSpeaking

> **isSpeaking**: `boolean`

Defined in: [types/client.ts:760](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L760)

Whether currently speaking

---

### isProcessing

> **isProcessing**: `boolean`

Defined in: [types/client.ts:762](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L762)

Whether processing

---

### transcript

> **transcript**: `string`

Defined in: [types/client.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L764)

Current transcript

---

### response

> **response**: `string` \| `null`

Defined in: [types/client.ts:766](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L766)

Last response

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:768](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L768)

Error state

---

### isSupported

> **isSupported**: `boolean`

Defined in: [types/client.ts:770](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L770)

Supported by browser
