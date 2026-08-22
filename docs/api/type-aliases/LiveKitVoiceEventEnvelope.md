[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceEventEnvelope

# Type Alias: LiveKitVoiceEventEnvelope

> **LiveKitVoiceEventEnvelope** = [`LiveKitVoiceEvent`](LiveKitVoiceEvent.md) & `object`

Defined in: [types/livekit.ts:324](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L324)

Wire format published to the browser: a `LiveKitVoiceEvent` plus a monotonic
sequence number and a timestamp so the client can order and de-duplicate.

## Type Declaration

### seq

> **seq**: `number`

### ts

> **ts**: `number`
