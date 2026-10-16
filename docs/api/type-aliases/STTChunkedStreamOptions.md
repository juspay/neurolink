[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTChunkedStreamOptions

# Type Alias: STTChunkedStreamOptions

> **STTChunkedStreamOptions** = [`STTStreamingOptions`](STTStreamingOptions.md) & `object`

Options of `chunkedTranscribeStream`: the streaming tuning plus engine labels and hooks.

## Type Declaration

### engineLabel?

> `optional` **engineLabel?**: `string`

Label of the primary engine in events. Default "primary".

### fallback?

> `optional` **fallback?**: `object`

Language takeover: hand an utterance the primary cannot read to the `fallback` role.

#### fallback.label

> **label**: `string`

#### fallback.when?

> `optional` **when?**: [`STTFallbackOptions`](STTFallbackOptions.md)\[`"when"`\]

### routing?

> `optional` **routing?**: [`STTRoutingOptions`](STTRoutingOptions.md)

Probe, lock and prior behaviour (see `STTRoutingOptions`); the defaults apply when omitted.

### speechDetector?

> `optional` **speechDetector?**: [`STTSpeechDetector`](STTSpeechDetector.md) \| `null`

A speech detector of the caller's own, used instead of what `vad`
would load; `null` keeps the energy gate. Omitted, `vad` decides.

### onUtteranceEnd?

> `optional` **onUtteranceEnd?**: (`pcm16k`, `utterance`, `engine`) => `void`

Called once per utterance, synchronously, when it ends and before its
final pass is queued, with the utterance audio at 16 kHz and the role
that will run the final — so a second opinion can run in parallel.

#### Parameters

##### pcm16k

`Float32Array`

##### utterance

`number`

##### engine

[`STTStreamEngineRole`](STTStreamEngineRole.md)

#### Returns

`void`
