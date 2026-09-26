[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / registerDefaultRealtimeHandlers

# Function: registerDefaultRealtimeHandlers()

> **registerDefaultRealtimeHandlers**(): `void`

Register every shipped Realtime handler. Realtime handlers don't gate
registration on isConfigured() because session-time API keys can be
supplied per-call; missing creds surface when `connect()` is invoked.

## Returns

`void`
