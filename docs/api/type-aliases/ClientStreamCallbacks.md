[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamCallbacks

# Type Alias: ClientStreamCallbacks

> **ClientStreamCallbacks** = `object`

Defined in: [types/client.ts:182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L182)

Streaming callback handlers

## Properties

### onText?

> `optional` **onText?**: (`text`) => `void`

Defined in: [types/client.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L184)

Called for each text chunk

#### Parameters

##### text

`string`

#### Returns

`void`

---

### onToolCall?

> `optional` **onToolCall?**: (`toolCall`) => `void`

Defined in: [types/client.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L186)

Called for each tool call

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### onToolResult?

> `optional` **onToolResult?**: (`toolResult`) => `void`

Defined in: [types/client.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L188)

Called for each tool result

#### Parameters

##### toolResult

[`StreamToolResult`](StreamToolResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L190)

Called on stream error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onDone?

> `optional` **onDone?**: (`result`) => `void`

Defined in: [types/client.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L192)

Called when stream completes

#### Parameters

##### result

[`ClientStreamResult`](ClientStreamResult.md)

#### Returns

`void`

---

### onMetadata?

> `optional` **onMetadata?**: (`metadata`) => `void`

Defined in: [types/client.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L194)

Called for metadata updates

#### Parameters

##### metadata

[`JsonObject`](JsonObject.md)

#### Returns

`void`

---

### onAudio?

> `optional` **onAudio?**: (`audio`) => `void`

Defined in: [types/client.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L196)

Called for audio chunks

#### Parameters

##### audio

###### data

`string`

###### format

`string`

#### Returns

`void`

---

### onThinking?

> `optional` **onThinking?**: (`thinking`) => `void`

Defined in: [types/client.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L198)

Called for thinking/reasoning output

#### Parameters

##### thinking

`string`

#### Returns

`void`
