[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientSpeechRecognitionResult

# Type Alias: ClientSpeechRecognitionResult

> **ClientSpeechRecognitionResult** = `object`

Defined in: [types/client.ts:1044](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1044)

Speech recognition result

## Properties

### transcript

> **transcript**: `string`

Defined in: [types/client.ts:1046](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1046)

Transcript text

---

### confidence

> **confidence**: `number`

Defined in: [types/client.ts:1048](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1048)

Confidence score (0-1)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/client.ts:1050](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1050)

Whether this is the final result
