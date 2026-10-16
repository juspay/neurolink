[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOutputRenderInput

# Type Alias: STTOutputRenderInput

> **STTOutputRenderInput** = `object`

One rendering request: lines of one transcript and the targets they go to.

## Properties

### source

> **source**: readonly `string`[]

The text as the engine wrote it (native script, dictionary applied), one entry per line.

---

### corrected?

> `optional` **corrected?**: readonly `string`[]

The corrected text of the same lines, when correction changed it.

---

### language?

> `optional` **language?**: `string`

Detected language of the speech, when known.

---

### languages

> **languages**: readonly `string`[]

---

### previous?

> `optional` **previous?**: `ReadonlyArray`\<\{ `text`: `string`; `outputs`: `Record`\<`string`, `string`\>; \}\>

Earlier lines, oldest first, with their renderings per target.

---

### dictionary?

> `optional` **dictionary?**: readonly [`STTDictionaryEntry`](STTDictionaryEntry.md)[]

---

### options?

> `optional` **options?**: `Omit`\<[`STTOutputOptions`](STTOutputOptions.md), `"languages"`\>
