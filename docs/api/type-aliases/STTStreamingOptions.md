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

---

### concurrency?

> `optional` **concurrency?**: `number`

Engine passes allowed in flight at once. Live streaming keeps 1 (the
default), so a caption never shows a stale pass; the file path
(`chunking: "utterances"`) raises it so utterances are transcribed and
corrected in parallel.

---

### finalRetries?

> `optional` **finalRetries?**: `number`

Times a failed final pass is tried again before the utterance is
reported as silence. Live streaming keeps 0 (a stale retry would delay
the next utterance); the file path uses 1.

---

### vad?

> `optional` **vad?**: [`STTVadOptions`](STTVadOptions.md)

Which speech detector finds utterances, and its thresholds. Default: Silero when it loads, else the energy gate.

---

### normalize?

> `optional` **normalize?**: `boolean`

Raise quiet utterances to a speech level before an engine hears them
(gain only goes up, capped at 8×, peaks limited). Far-field and
low-gain microphones are the usual case. Default true.
