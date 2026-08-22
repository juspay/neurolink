[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitEventBridgeParams

# Type Alias: LiveKitEventBridgeParams

> **LiveKitEventBridgeParams** = `object`

Defined in: [types/livekit.ts:393](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L393)

Inputs to `attachEventBridge`.

## Properties

### room

> **room**: [`LiveKitBridgeRoom`](LiveKitBridgeRoom.md)

Defined in: [types/livekit.ts:395](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L395)

The LiveKit room for this call (from the job context).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>

Defined in: [types/livekit.ts:397](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L397)

NeuroLink's event emitter (`neurolink.getEventEmitter()`).

---

### options?

> `optional` **options?**: [`LiveKitEventBridgeConfig`](LiveKitEventBridgeConfig.md)

Defined in: [types/livekit.ts:399](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L399)

Bridge options (topics, filtering, chunking threshold).
