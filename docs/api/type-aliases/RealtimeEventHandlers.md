[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventHandlers

# Type Alias: RealtimeEventHandlers

> **RealtimeEventHandlers** = `object`

Realtime event handler callbacks

## Properties

### onAudio?

> `optional` **onAudio?**: (`chunk`) => `void`

Called when audio is received

#### Parameters

##### chunk

[`RealtimeAudioChunk`](RealtimeAudioChunk.md)

#### Returns

`void`

---

### onTranscript?

> `optional` **onTranscript?**: (`text`, `isFinal`) => `void`

Called when text/transcript is received

#### Parameters

##### text

`string`

##### isFinal

`boolean`

#### Returns

`void`

---

### onText?

> `optional` **onText?**: (`text`, `isFinal`) => `void`

Called when the model generates text

#### Parameters

##### text

`string`

##### isFinal

`boolean`

#### Returns

`void`

---

### onFunctionCall?

> `optional` **onFunctionCall?**: (`name`, `args`) => `Promise`\<`unknown`\>

Called when a function call is requested

#### Parameters

##### name

`string`

##### args

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Called when session state changes

#### Parameters

##### state

[`RealtimeSessionState`](RealtimeSessionState.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Called when an error occurs

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onTurnStart?

> `optional` **onTurnStart?**: () => `void`

Called when a turn starts

#### Returns

`void`

---

### onTurnEnd?

> `optional` **onTurnEnd?**: () => `void`

Called when a turn ends

#### Returns

`void`
