[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleEngineOutput

# Type Alias: WhistleEngineOutput

> **WhistleEngineOutput** = `object`

A finished batch transcription from the Whistle worker, all chunks joined.

## Properties

### text

> **text**: `string`

---

### language

> **language**: `string` \| `null`

---

### words

> **words**: [`WhistleWord`](WhistleWord.md)[]

---

### ttftMs

> **ttftMs**: `number` \| `null`

Time to first token of the first chunk.

---

### decodeTps

> **decodeTps**: `number` \| `null`

Mean decode speed over the chunks, tokens per second.

---

### chunks

> **chunks**: `number`

How many ≤30 s pieces the audio was cut into.
