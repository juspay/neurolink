[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceEventEnvelope

# Type Alias: LiveKitVoiceEventEnvelope

> **LiveKitVoiceEventEnvelope** = [`LiveKitVoiceEvent`](LiveKitVoiceEvent.md) & `object`

Wire format published to the browser: a `LiveKitVoiceEvent` plus a monotonic
sequence number and a timestamp so the client can order and de-duplicate.

## Type Declaration

### seq

> **seq**: `number`

### ts

> **ts**: `number`
