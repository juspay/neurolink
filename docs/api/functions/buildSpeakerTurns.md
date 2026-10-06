[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildSpeakerTurns

# Function: buildSpeakerTurns()

> **buildSpeakerTurns**(`words`): [`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)[]

Merge consecutive same-speaker words into turns.

A word without a speaker continues the current turn (providers emit
unlabelled punctuation and spacing tokens); a word with a different
speaker starts a new one. Words are joined with single spaces and the
result trimmed, so text built from punctuated words reads naturally.
Returns `[]` when no word carries a speaker, so callers can tell "no
diarization" apart from "one speaker".

## Parameters

### words

[`WordTiming`](../type-aliases/WordTiming.md)[]

## Returns

[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)[]
