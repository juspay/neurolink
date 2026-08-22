[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureRecognitionResult

# Type Alias: AzureRecognitionResult

> **AzureRecognitionResult** = `object`

Defined in: [types/stt.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L414)

## Properties

### RecognitionStatus

> **RecognitionStatus**: `"Success"` \| `"NoMatch"` \| `"InitialSilenceTimeout"` \| `"BabbleTimeout"` \| `"Error"` \| `string`

Defined in: [types/stt.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L415)

---

### Offset?

> `optional` **Offset?**: `number`

Defined in: [types/stt.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L422)

---

### Duration?

> `optional` **Duration?**: `number`

Defined in: [types/stt.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L423)

---

### DisplayText?

> `optional` **DisplayText?**: `string`

Defined in: [types/stt.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L424)

---

### NBest?

> `optional` **NBest?**: [`AzureNBest`](AzureNBest.md)[]

Defined in: [types/stt.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L425)
