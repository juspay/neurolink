[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / registerDefaultRealtimeHandlers

# Function: registerDefaultRealtimeHandlers()

> **registerDefaultRealtimeHandlers**(): `void`

Defined in: [voice/index.ts:300](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/voice/index.ts#L300)

Register every shipped Realtime handler. Realtime handlers don't gate
registration on isConfigured() because session-time API keys can be
supplied per-call; missing creds surface when `connect()` is invoked.

## Returns

`void`
