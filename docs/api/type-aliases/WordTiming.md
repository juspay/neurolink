[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WordTiming

# Type Alias: WordTiming

> **WordTiming** = `object`

Defined in: [types/stt.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L106)

Word-level timing information

## Properties

### word

> **word**: `string`

Defined in: [types/stt.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L108)

The word

---

### startTime?

> `optional` **startTime?**: `number`

Defined in: [types/stt.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L110)

Start time in seconds

---

### start?

> `optional` **start?**: `number`

Defined in: [types/stt.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L112)

Start time alias

---

### endTime?

> `optional` **endTime?**: `number`

Defined in: [types/stt.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L114)

End time in seconds

---

### end?

> `optional` **end?**: `number`

Defined in: [types/stt.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L116)

End time alias

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/stt.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L118)

Confidence score (0-1)

---

### speaker?

> `optional` **speaker?**: `string`

Defined in: [types/stt.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/stt.ts#L120)

Speaker label (for diarization)
