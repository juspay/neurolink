[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleWorkerResponse

# Type Alias: WhistleWorkerResponse

> **WhistleWorkerResponse** = \{ `kind`: `"ready"`; `loadMs`: `number`; \} \| \{ `kind`: `"bootError"`; `error`: `string`; \} \| \{ `kind`: `"transcribed"`; `id`: `number`; `result`: [`WhistleEngineOutput`](WhistleEngineOutput.md); \} \| \{ `kind`: `"streamStep"`; `id`: `number`; `result`: [`WhistleStreamStep`](WhistleStreamStep.md); \} \| \{ `kind`: `"failed"`; `id`: `number`; `error`: `string`; \}

Messages the Whistle worker thread sends back.
