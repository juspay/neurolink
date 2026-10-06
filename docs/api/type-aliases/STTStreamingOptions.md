[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTStreamingOptions

# Type Alias: STTStreamingOptions

> **STTStreamingOptions** = `object`

Client-side streaming for engines without a native stream (and tuning for the adapter).

## Properties

### mode?

> `optional` **mode?**: `"auto"` \| `"native"` \| `"chunked"`

`"auto"` uses the handler's native stream when it has one, else the chunked adapter.

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate of the incoming PCM16LE frames. Default 16000.

---

### endSilenceMs?

> `optional` **endSilenceMs?**: `number`

Silence that ends an utterance. Default 750.

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Cadence of interim passes on the current utterance. Default 900.

---

### softCutSeconds?

> `optional` **softCutSeconds?**: `number`

After this many seconds a turn ends at the next short pause. Default 16.

---

### maxUtteranceSeconds?

> `optional` **maxUtteranceSeconds?**: `number`

Hard cut at the quietest recent block, remainder carried over. Default 28.

---

### onsetRms?

> `optional` **onsetRms?**: `number`

Absolute RMS floor for speech onset. Default 0.006.

---

### prerollMs?

> `optional` **prerollMs?**: `number`

Audio kept before the detected onset. Default 350.

---

### minSpeechMs?

> `optional` **minSpeechMs?**: `number`

Shortest utterance worth a pass. Default 250.
