[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTChunkedRun

# Type Alias: STTChunkedRun

> **STTChunkedRun** = (`pcm16k`, `options`) => `Promise`\<[`STTResult`](STTResult.md)\>

One engine pass over a whole utterance, 16 kHz mono float samples in.

## Parameters

### pcm16k

`Float32Array`

### options

[`STTChunkedPassOptions`](STTChunkedPassOptions.md)

## Returns

`Promise`\<[`STTResult`](STTResult.md)\>
