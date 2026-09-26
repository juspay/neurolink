[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamCallbacks

# Type Alias: ClientStreamCallbacks

> **ClientStreamCallbacks** = `object`

Streaming callback handlers

## Properties

### onText?

> `optional` **onText?**: (`text`) => `void`

Called for each text chunk

#### Parameters

##### text

`string`

#### Returns

`void`

---

### onToolCall?

> `optional` **onToolCall?**: (`toolCall`) => `void`

Called for each tool call

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### onToolResult?

> `optional` **onToolResult?**: (`toolResult`) => `void`

Called for each tool result

#### Parameters

##### toolResult

[`StreamToolResult`](StreamToolResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Called on stream error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onDone?

> `optional` **onDone?**: (`result`) => `void`

Called when stream completes

#### Parameters

##### result

[`ClientStreamResult`](ClientStreamResult.md)

#### Returns

`void`

---

### onMetadata?

> `optional` **onMetadata?**: (`metadata`) => `void`

Called for metadata updates

#### Parameters

##### metadata

[`JsonObject`](JsonObject.md)

#### Returns

`void`

---

### onAudio?

> `optional` **onAudio?**: (`audio`) => `void`

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

Called for thinking/reasoning output

#### Parameters

##### thinking

`string`

#### Returns

`void`
