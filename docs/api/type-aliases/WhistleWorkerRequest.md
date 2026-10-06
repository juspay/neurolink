[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleWorkerRequest

# Type Alias: WhistleWorkerRequest

> **WhistleWorkerRequest** = \{ `id`: `number`; `op`: `"transcribe"`; `pcm`: `Float32Array`; `language`: `string` \| `null`; `keywords`: `string` \| `null`; `timestamps`: `boolean`; \} \| \{ `id`: `number`; `op`: `"streamProcess"`; `pcm`: `Float32Array`; `language`: `string` \| `null`; `keywords`: `string` \| `null`; \} \| \{ `id`: `number`; `op`: `"streamStop"`; \}

Messages the handler sends to the Whistle worker thread.
