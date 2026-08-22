[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitEventBridgeHandle

# Type Alias: LiveKitEventBridgeHandle

> **LiveKitEventBridgeHandle** = `object`

Defined in: [types/livekit.ts:403](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L403)

Handle returned by `attachEventBridge` for teardown.

## Properties

### dispose

> **dispose**: () => `void`

Defined in: [types/livekit.ts:405](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L405)

Remove all listeners and stop publishing. Idempotent.

#### Returns

`void`
