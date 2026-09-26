[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandOutputPage

# Type Alias: BackgroundCommandOutputPage

> **BackgroundCommandOutputPage** = `object`

One character window of a command's output, read straight from the log file.

## Properties

### taskId

> **taskId**: `string`

---

### stream

> **stream**: [`BackgroundCommandStreamName`](BackgroundCommandStreamName.md)

---

### content

> **content**: `string`

---

### offset

> **offset**: `number`

---

### limit

> **limit**: `number`

---

### totalSize

> **totalSize**: `number`

Characters in the whole stream, including what this page did not return.

---

### hasMore

> **hasMore**: `boolean`
