[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitSttConfig

# Type Alias: LiveKitSttConfig

> **LiveKitSttConfig** = `object`

Speech-to-text plugin selection for the LiveKit worker.

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### language?

> `optional` **language?**: `string`

---

### maxEndpointDelayMs?

> `optional` **maxEndpointDelayMs?**: `number`

Soniox only: maximum delay (ms) between speech cessation and the STT
endpoint. Raise it so Soniox does not finalize on short pauses — that lets
VAD silence (not the STT endpoint) decide when the turn ends.
