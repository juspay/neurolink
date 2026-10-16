[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTRealtimeProfile

# Type Alias: ServerSTTRealtimeProfile

> **ServerSTTRealtimeProfile** = `Omit`\<[`ServerTranscribeStreamConfig`](ServerTranscribeStreamConfig.md), `"mode"`\> & `object`

What an OpenAI-Realtime client gets when it names this profile as its
`model`. A realtime client can send only a model, a language, a prompt and
turn-detection numbers, so everything NeuroLink-specific (engine, fallback,
dictionary, correction, output languages) is the operator's, here.

A `model` that is no profile but a configured STT provider uses that
provider with the defaults; any other name (OpenAI's own
`gpt-4o-mini-transcribe`, say) uses the profile named `default`, or the
server's defaults when there is none.

## Type Declaration

### completed?

> `optional` **completed?**: `"corrected"` \| `"final"`

What `…input_audio_transcription.completed` carries: the corrected text
(`"corrected"`, default; it waits up to `correctionWaitMs` for the
correction, then sends the raw final) or the raw final at once.

### correctionWaitMs?

> `optional` **correctionWaitMs?**: `number`

Longest wait for the correction before `completed` goes out with the final. Default 3000.

### clientLanguage?

> `optional` **clientLanguage?**: `boolean`

Whether the client's `language` pins the transcription. Default `true`.
Note the LiveKit plugin sends `"en"` unless `detect_language=True`.

### clientTurnDetection?

> `optional` **clientTurnDetection?**: `boolean`

Whether the client's `turn_detection.silence_duration_ms` sets the
utterance's closing pause. Default `false`: NeuroLink's endpointer keeps
its own (750 ms), since a client default such as LiveKit's 350 ms cuts
conversational speech mid-sentence.
