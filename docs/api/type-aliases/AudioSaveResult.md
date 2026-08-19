[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioSaveResult

# Type Alias: AudioSaveResult

> **AudioSaveResult** = `object`

Defined in: [types/tts.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L146)

Result of saving audio to file

## Properties

### success

> **success**: `boolean`

Defined in: [types/tts.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L148)

Whether the save was successful

---

### path

> **path**: `string`

Defined in: [types/tts.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L150)

Full path to the saved file

---

### size

> **size**: `number`

Defined in: [types/tts.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L152)

File size in bytes

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tts.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L154)

Error message if failed
