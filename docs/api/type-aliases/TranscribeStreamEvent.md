[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeStreamEvent

# Type Alias: TranscribeStreamEvent

> **TranscribeStreamEvent** = \{ `type`: `"interim"`; `utterance`: `number`; `text`: `string`; `committed`: `string`; `tail`: `string`; `seconds`: `number`; `latencyMs`: `number`; `engine`: `string`; \} \| \{ `type`: `"language"`; `utterance`: `number`; `language`: `string`; `detected`: `boolean`; `scores?`: [`STTLanguageScore`](STTLanguageScore.md)[]; \} \| \{ `type`: `"final"`; `utterance`: `number`; `text`: `string`; `segment`: [`TranscriptionSegment`](TranscriptionSegment.md); `words?`: [`WordTiming`](WordTiming.md)[]; `language?`: `string`; `languageDetected?`: `boolean`; `engine`: `string`; `fallbackUsed?`: `boolean`; `seconds`: `number`; \} \| \{ `type`: `"correcting"`; `utterance`: `number`; `text`: `string`; \} \| \{ `type`: `"corrected"`; `utterance`: `number`; `raw`: `string`; `text`: `string`; `decisions`: [`STTDecisionRecord`](STTDecisionRecord.md)[]; `steps`: `string`[]; `timings`: [`TranscribeTimings`](TranscribeTimings.md); \} \| \{ `type`: `"silence"`; `utterance`: `number`; `seconds`: `number`; \} \| \{ `type`: `"error"`; `utterance?`: `number`; `message`: `string`; `recoverable`: `boolean`; \}

## Union Members

### Type Literal

\{ `type`: `"interim"`; `utterance`: `number`; `text`: `string`; `committed`: `string`; `tail`: `string`; `seconds`: `number`; `latencyMs`: `number`; `engine`: `string`; \}

#### type

> **type**: `"interim"`

#### utterance

> **utterance**: `number`

#### text

> **text**: `string`

Full current text of the utterance.

#### committed

> **committed**: `string`

Prefix two consecutive passes agreed on (LocalAgreement).

#### tail

> **tail**: `string`

The rest, still subject to change.

#### seconds

> **seconds**: `number`

#### latencyMs

> **latencyMs**: `number`

#### engine

> **engine**: `string`

---

### Type Literal

\{ `type`: `"language"`; `utterance`: `number`; `language`: `string`; `detected`: `boolean`; `scores?`: [`STTLanguageScore`](STTLanguageScore.md)[]; \}

---

### Type Literal

\{ `type`: `"final"`; `utterance`: `number`; `text`: `string`; `segment`: [`TranscriptionSegment`](TranscriptionSegment.md); `words?`: [`WordTiming`](WordTiming.md)[]; `language?`: `string`; `languageDetected?`: `boolean`; `engine`: `string`; `fallbackUsed?`: `boolean`; `seconds`: `number`; \}

---

### Type Literal

\{ `type`: `"correcting"`; `utterance`: `number`; `text`: `string`; \}

#### type

> **type**: `"correcting"`

Partial text of the streamed rewrite, in order.

#### utterance

> **utterance**: `number`

#### text

> **text**: `string`

---

### Type Literal

\{ `type`: `"corrected"`; `utterance`: `number`; `raw`: `string`; `text`: `string`; `decisions`: [`STTDecisionRecord`](STTDecisionRecord.md)[]; `steps`: `string`[]; `timings`: [`TranscribeTimings`](TranscribeTimings.md); \}

---

### Type Literal

\{ `type`: `"silence"`; `utterance`: `number`; `seconds`: `number`; \}

#### type

> **type**: `"silence"`

An utterance no engine could read; its audio length is reported so nothing disappears silently.

#### utterance

> **utterance**: `number`

#### seconds

> **seconds**: `number`

---

### Type Literal

\{ `type`: `"error"`; `utterance?`: `number`; `message`: `string`; `recoverable`: `boolean`; \}

#### type

> **type**: `"error"`

#### utterance?

> `optional` **utterance?**: `number`

#### message

> **message**: `string`

#### recoverable

> **recoverable**: `boolean`

`true` when the stream continues with the next utterance.
