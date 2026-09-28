[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / prepareTextForSpeech

# Function: prepareTextForSpeech()

> **prepareTextForSpeech**(`text`, `opts?`): `string`

Rewrite `text` into what a TTS voice should say.

Pure and deterministic: the same input and options always yield the same
output, and nothing here reads the environment. Runs in time linear in the
length of `text`.

## Parameters

### text

`string`

### opts?

[`SpeechSanitizeOptions`](../type-aliases/SpeechSanitizeOptions.md)

## Returns

`string`

## Example

```typescript
prepareTextForSpeech(
  "## Title\n\nSee **this** at https://docs.example.com/x 🎉",
);
// → "Title\n\nSee this at docs.example.com"
```
