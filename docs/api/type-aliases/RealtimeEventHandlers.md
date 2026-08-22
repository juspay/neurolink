[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventHandlers

# Type Alias: RealtimeEventHandlers

> **RealtimeEventHandlers** = `object`

Defined in: [types/realtime.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L184)

Realtime event handler callbacks

## Properties

### onAudio?

> `optional` **onAudio?**: (`chunk`) => `void`

Defined in: [types/realtime.ts:186](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L186)

Called when audio is received

#### Parameters

##### chunk

[`RealtimeAudioChunk`](RealtimeAudioChunk.md)

#### Returns

`void`

---

### onTranscript?

> `optional` **onTranscript?**: (`text`, `isFinal`) => `void`

Defined in: [types/realtime.ts:188](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L188)

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

Defined in: [types/realtime.ts:190](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L190)

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

Defined in: [types/realtime.ts:192](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L192)

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

Defined in: [types/realtime.ts:197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L197)

Called when session state changes

#### Parameters

##### state

[`RealtimeSessionState`](RealtimeSessionState.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/realtime.ts:199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L199)

Called when an error occurs

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onTurnStart?

> `optional` **onTurnStart?**: () => `void`

Defined in: [types/realtime.ts:201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L201)

Called when a turn starts

#### Returns

`void`

---

### onTurnEnd?

> `optional` **onTurnEnd?**: () => `void`

Defined in: [types/realtime.ts:203](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/realtime.ts#L203)

Called when a turn ends

#### Returns

`void`
