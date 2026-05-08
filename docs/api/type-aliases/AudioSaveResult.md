[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioSaveResult

# Type Alias: AudioSaveResult

> **AudioSaveResult** = `object`

Defined in: [types/tts.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L119)

Result of saving audio to file

## Properties

### success

> **success**: `boolean`

Defined in: [types/tts.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L121)

Whether the save was successful

---

### path

> **path**: `string`

Defined in: [types/tts.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L123)

Full path to the saved file

---

### size

> **size**: `number`

Defined in: [types/tts.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L125)

File size in bytes

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tts.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L127)

Error message if failed
