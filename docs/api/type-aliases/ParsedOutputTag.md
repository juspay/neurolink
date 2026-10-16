[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOutputTag

# Type Alias: ParsedOutputTag

> **ParsedOutputTag** = `object`

One output target, parsed: `"hi-Latn"` → `{ language: "hi", script: "Latn" }`.

## Properties

### tag

> **tag**: `string`

---

### language

> **language**: `string`

---

### script

> **script**: [`ScriptCode`](ScriptCode.md)

The script the text must be written in: the subtag, else the language's own.

---

### explicitScript

> **explicitScript**: `boolean`

True when the tag names a script (`hi-Latn`), not just a language.
