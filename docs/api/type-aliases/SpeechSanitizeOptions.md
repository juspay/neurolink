[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpeechSanitizeOptions

# Type Alias: SpeechSanitizeOptions

> **SpeechSanitizeOptions** = `object`

Options for [prepareTextForSpeech](../functions/prepareTextForSpeech.md) — the optional cleanup pass that
turns model output (markdown, URLs, emoji) into text a TTS voice can read
aloud. Every default below is what `tts: { sanitize: true }` applies.

## Properties

### markdown?

> `optional` **markdown?**: `boolean`

Strip markdown syntax: headings, emphasis, inline code, list bullets,
blockquotes, tables (kept as comma-separated rows), links and images
(kept as their text). Fenced code blocks follow `codeBlocks`.

#### Default

```ts
true;
```

---

### codeBlocks?

> `optional` **codeBlocks?**: `"drop"` \| `"phrase"` \| `"keep"`

How fenced code blocks are spoken. `"drop"` removes them entirely,
`"phrase"` replaces each block with `codeBlockPhrase`, `"keep"` strips
only the fence lines and reads the contents. Incremental `stream()`
synthesis always uses `"keep"`: a segment may hold an unterminated fence,
so the block's extent is unknowable per segment.

#### Default

```ts
"phrase";
```

---

### codeBlockPhrase?

> `optional` **codeBlockPhrase?**: `string`

Spoken stand-in for a fenced code block when `codeBlocks` is `"phrase"`.

#### Default

```ts
"Code block omitted.";
```

---

### urls?

> `optional` **urls?**: `"hostname"` \| `"remove"`

How URLs are spoken. `"hostname"` reduces `https://docs.example.com/a/b`
to `docs.example.com`; `"remove"` drops the URL altogether.

#### Default

```ts
"hostname";
```

---

### emoji?

> `optional` **emoji?**: `boolean`

Remove emoji and pictographs (`\p{Extended_Pictographic}`,
`\p{Emoji_Presentation}`, plus modifiers and joiners).

#### Default

```ts
true;
```
