[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandOutputPage

# Type Alias: BackgroundCommandOutputPage

> **BackgroundCommandOutputPage** = `object`

Defined in: [types/backgroundCommand.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L144)

One character window of a command's output, read straight from the log file.

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/backgroundCommand.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L145)

---

### stream

> **stream**: [`BackgroundCommandStreamName`](BackgroundCommandStreamName.md)

Defined in: [types/backgroundCommand.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L146)

---

### content

> **content**: `string`

Defined in: [types/backgroundCommand.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L147)

---

### offset

> **offset**: `number`

Defined in: [types/backgroundCommand.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L148)

---

### limit

> **limit**: `number`

Defined in: [types/backgroundCommand.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L149)

---

### totalSize

> **totalSize**: `number`

Defined in: [types/backgroundCommand.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L151)

Characters in the whole stream, including what this page did not return.

---

### hasMore

> **hasMore**: `boolean`

Defined in: [types/backgroundCommand.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L152)
