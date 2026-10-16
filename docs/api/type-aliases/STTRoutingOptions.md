[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTRoutingOptions

# Type Alias: STTRoutingOptions

> **STTRoutingOptions** = `object`

How the engines share an utterance. With a `fallback` set, the default is
to probe: the first pass of every utterance runs the primary and the
fallback in parallel, and whichever reads the language leads from then on,
so a sentence in the "wrong" language never waits for the slow takeover.

## Properties

### probe?

> `optional` **probe?**: `boolean`

Streaming: run the fallback engine beside the primary on the first pass
of each utterance and lead with the one that reads the language.
Batch: ask the primary for a language verdict first (its
`languageProbeModel`, when it has one) and transcribe with the engine
that fits. Default: on whenever a fallback is set.

---

### lockAfterPasses?

> `optional` **lockAfterPasses?**: `number`

Streaming: passes both engines keep running before the utterance's engine locks. Default 2.

---

### prior?

> `optional` **prior?**: `"carry"` \| `"none"`

Carry the last confidently detected language into the next utterance's detection (`"carry"`, default) or start each utterance cold (`"none"`).

---

### engines?

> `optional` **engines?**: `Record`\<`string`, `string`\>

Which engine transcribes which language: `{ hi: "indic", ta: "indic",
en: "spark", "*": "spark" }`. A final whose detected language belongs to
another engine than the one that produced it is transcribed again by
that engine, and its text is used when it reads the language. `"*"` is
the engine for every language not listed. Values are provider names.
