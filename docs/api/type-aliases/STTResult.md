[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTResult

# Type Alias: STTResult

> **STTResult** = `object`

## Properties

### text

> **text**: `string`

Full transcribed text

---

### confidence

> **confidence**: `number`

Transcript confidence (0-1) — Deepgram's alternative confidence,
Whisper's `exp(avg_logprob)`, Scribe's mean per-word `exp(logprob)`.
Always present: a strict-TS consumer reads it without a guard. A provider
with no transcript-level signal reports 0 and, where it can, says so in
`metadata.confidenceSource` rather than passing off a different number
(a language-detection probability, say) as this one silently.

---

### language?

> `optional` **language?**: `string`

Detected language code

---

### duration?

> `optional` **duration?**: `number`

Audio duration in seconds

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Word-level timings

---

### segments?

> `optional` **segments?**: [`TranscriptionSegment`](TranscriptionSegment.md)[]

Transcription segments

---

### speakers?

> `optional` **speakers?**: `string`[]

Speaker labels (for diarization)

---

### metadata?

> `optional` **metadata?**: `object`

Performance metadata

#### Index Signature

\[`key`: `string`\]: `unknown`

Additional provider-specific metadata

#### latency

> **latency**: `number`

Processing latency in milliseconds

#### provider?

> `optional` **provider?**: `string`

Provider name

#### model?

> `optional` **model?**: `string`

Model used

#### hallucination?

> `optional` **hallucination?**: `"prompt-echo"`

Set by the output guards: what the engine produced was not speech.

#### loopShare?

> `optional` **loopShare?**: `number`

Share of the words a collapsed decoding loop had taken (0 when none).

#### routedProvider?

> `optional` **routedProvider?**: `string`

Set by language routing: the provider whose text this is, when not the pass's own engine.

#### confidenceSource?

> `optional` **confidenceSource?**: [`STTConfidenceSource`](STTConfidenceSource.md)

What `confidence` was derived from, for providers that must choose.
