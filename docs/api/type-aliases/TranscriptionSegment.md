[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscriptionSegment

# Type Alias: TranscriptionSegment

> **TranscriptionSegment** = `object`

Defined in: [types/stt.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L126)

Transcription segment for streaming STT

## Properties

### index?

> `optional` **index?**: `number`

Defined in: [types/stt.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L128)

Segment index

---

### text

> **text**: `string`

Defined in: [types/stt.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L130)

Transcribed text

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/stt.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L132)

Whether this is a final result

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/stt.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L134)

Confidence score (0-1)

---

### startTime?

> `optional` **startTime?**: `number`

Defined in: [types/stt.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L136)

Start time in audio (seconds)

---

### start?

> `optional` **start?**: `number`

Defined in: [types/stt.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L138)

Start time (alias for startTime)

---

### endTime?

> `optional` **endTime?**: `number`

Defined in: [types/stt.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L140)

End time in audio (seconds)

---

### end?

> `optional` **end?**: `number`

Defined in: [types/stt.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L142)

End time (alias for endTime)

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Defined in: [types/stt.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L144)

Word-level timings

---

### speaker?

> `optional` **speaker?**: `string`

Defined in: [types/stt.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L146)

Speaker label

---

### language?

> `optional` **language?**: `string`

Defined in: [types/stt.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L148)

Detected language
