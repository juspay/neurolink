[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioSaveResult

# Type Alias: AudioSaveResult

> **AudioSaveResult** = `object`

Defined in: [types/tts.ts:137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L137)

Result of saving audio to file

## Properties

### success

> **success**: `boolean`

Defined in: [types/tts.ts:139](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L139)

Whether the save was successful

---

### path

> **path**: `string`

Defined in: [types/tts.ts:141](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L141)

Full path to the saved file

---

### size

> **size**: `number`

Defined in: [types/tts.ts:143](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L143)

File size in bytes

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tts.ts:145](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L145)

Error message if failed
