[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTSpeechDetector

# Type Alias: STTSpeechDetector

> **STTSpeechDetector** = `object`

A frame-level speech detector: `frameSamples` of 16 kHz mono float audio
in, the probability that the frame is speech out. It keeps state across
calls (`reset()` starts a new stream), and one instance serves one stream.

## Properties

### name

> `readonly` **name**: `string`

Name reported on events (`vad`): `"silero"`, or whatever a caller's own detector calls itself.

---

### frameSamples

> `readonly` **frameSamples**: `number`

Samples per `score()` call at 16 kHz (Silero: 512, 32 ms).

## Methods

### score()

> **score**(`frame16k`): `number` \| `Promise`\<`number`\>

#### Parameters

##### frame16k

`Float32Array`

#### Returns

`number` \| `Promise`\<`number`\>

---

### reset()

> **reset**(): `void`

#### Returns

`void`
