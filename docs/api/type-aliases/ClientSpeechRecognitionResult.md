[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientSpeechRecognitionResult

# Type Alias: ClientSpeechRecognitionResult

> **ClientSpeechRecognitionResult** = `object`

Defined in: [types/client.ts:1044](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1044)

Speech recognition result

## Properties

### transcript

> **transcript**: `string`

Defined in: [types/client.ts:1046](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1046)

Transcript text

---

### confidence

> **confidence**: `number`

Defined in: [types/client.ts:1048](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1048)

Confidence score (0-1)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/client.ts:1050](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1050)

Whether this is the final result
