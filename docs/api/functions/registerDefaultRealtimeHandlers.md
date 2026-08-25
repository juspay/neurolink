[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / registerDefaultRealtimeHandlers

# Function: registerDefaultRealtimeHandlers()

> **registerDefaultRealtimeHandlers**(): `void`

Defined in: [voice/index.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/voice/index.ts#L333)

Register every shipped Realtime handler. Realtime handlers don't gate
registration on isConfigured() because session-time API keys can be
supplied per-call; missing creds surface when `connect()` is invoked.

## Returns

`void`
