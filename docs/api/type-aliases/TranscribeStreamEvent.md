[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeStreamEvent

# Type Alias: TranscribeStreamEvent

> **TranscribeStreamEvent** = \{ `type`: `"interim"`; `utterance`: `number`; `text`: `string`; `committed`: `string`; `tail`: `string`; `seconds`: `number`; `latencyMs`: `number`; `engine`: `string`; \} \| \{ `type`: `"language"`; `utterance`: `number`; `language`: `string`; `detected`: `boolean`; `scores?`: [`STTLanguageScore`](STTLanguageScore.md)[]; \} \| \{ `type`: `"final"`; `utterance`: `number`; `text`: `string`; `segment`: [`TranscriptionSegment`](TranscriptionSegment.md); `words?`: [`WordTiming`](WordTiming.md)[]; `language?`: `string`; `languageDetected?`: `boolean`; `engine`: `string`; `fallbackUsed?`: `boolean`; `seconds`: `number`; `vad?`: `string`; `speechSeconds?`: `number`; `alternative?`: \{ `engine`: `string`; `text`: `string`; \}; \} \| \{ `type`: `"correcting"`; `utterance`: `number`; `text`: `string`; \} \| \{ `type`: `"corrected"`; `utterance`: `number`; `raw`: `string`; `text`: `string`; `decisions`: [`STTDecisionRecord`](STTDecisionRecord.md)[]; `steps`: `string`[]; `timings`: [`TranscribeTimings`](TranscribeTimings.md); \} \| \{ `type`: `"output"`; `utterance`: `number`; `language`: `string`; `text`: `string`; `status`: [`STTOutputStatus`](STTOutputStatus.md); `basedOn`: `"final"` \| `"corrected"`; `ms`: `number`; `reason?`: `string`; \} \| \{ `type`: `"silence"`; `utterance`: `number`; `seconds`: `number`; `vad?`: `string`; `speechSeconds?`: `number`; \} \| \{ `type`: `"error"`; `utterance?`: `number`; `message`: `string`; `recoverable`: `boolean`; \}

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

\{ `type`: `"final"`; `utterance`: `number`; `text`: `string`; `segment`: [`TranscriptionSegment`](TranscriptionSegment.md); `words?`: [`WordTiming`](WordTiming.md)[]; `language?`: `string`; `languageDetected?`: `boolean`; `engine`: `string`; `fallbackUsed?`: `boolean`; `seconds`: `number`; `vad?`: `string`; `speechSeconds?`: `number`; `alternative?`: \{ `engine`: `string`; `text`: `string`; \}; \}

#### type

> **type**: `"final"`

#### utterance

> **utterance**: `number`

#### text

> **text**: `string`

#### segment

> **segment**: [`TranscriptionSegment`](TranscriptionSegment.md)

#### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

#### language?

> `optional` **language?**: `string`

#### languageDetected?

> `optional` **languageDetected?**: `boolean`

#### engine

> **engine**: `string`

#### fallbackUsed?

> `optional` **fallbackUsed?**: `boolean`

#### seconds

> **seconds**: `number`

#### vad?

> `optional` **vad?**: `string`

The detector that found this utterance: `"silero"`, `"energy"`, or a caller's own.

#### speechSeconds?

> `optional` **speechSeconds?**: `number`

Seconds the detector counted as speech inside the utterance.

#### alternative?

> `optional` **alternative?**: `object`

The other engine's reading of the same utterance, when the two
disagreed on its language and the final ran both: code-mixed speech
is reconciled from both readings (`secondOpinion: "auto"`).

##### alternative.engine

> **engine**: `string`

##### alternative.text

> **text**: `string`

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

\{ `type`: `"output"`; `utterance`: `number`; `language`: `string`; `text`: `string`; `status`: [`STTOutputStatus`](STTOutputStatus.md); `basedOn`: `"final"` \| `"corrected"`; `ms`: `number`; `reason?`: `string`; \}

#### type

> **type**: `"output"`

The utterance in one output language. Follows `corrected` when
correction runs (`basedOn: "corrected"`), else the `final`.

#### utterance

> **utterance**: `number`

#### language

> **language**: `string`

#### text

> **text**: `string`

#### status

> **status**: [`STTOutputStatus`](STTOutputStatus.md)

#### basedOn

> **basedOn**: `"final"` \| `"corrected"`

#### ms

> **ms**: `number`

#### reason?

> `optional` **reason?**: `string`

---

### Type Literal

\{ `type`: `"silence"`; `utterance`: `number`; `seconds`: `number`; `vad?`: `string`; `speechSeconds?`: `number`; \}

#### type

> **type**: `"silence"`

An utterance no engine could read; its audio length is reported so nothing disappears silently.

#### utterance

> **utterance**: `number`

#### seconds

> **seconds**: `number`

#### vad?

> `optional` **vad?**: `string`

#### speechSeconds?

> `optional` **speechSeconds?**: `number`

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
