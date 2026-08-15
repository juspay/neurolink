[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceEventEnvelope

# Type Alias: LiveKitVoiceEventEnvelope

> **LiveKitVoiceEventEnvelope** = [`LiveKitVoiceEvent`](LiveKitVoiceEvent.md) & `object`

Defined in: [types/livekit.ts:324](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L324)

Wire format published to the browser: a `LiveKitVoiceEvent` plus a monotonic
sequence number and a timestamp so the client can order and de-duplicate.

## Type Declaration

### seq

> **seq**: `number`

### ts

> **ts**: `number`
