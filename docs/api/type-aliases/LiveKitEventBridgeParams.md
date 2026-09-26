[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitEventBridgeParams

# Type Alias: LiveKitEventBridgeParams

> **LiveKitEventBridgeParams** = `object`

Inputs to `attachEventBridge`.

## Properties

### room

> **room**: [`LiveKitBridgeRoom`](LiveKitBridgeRoom.md)

The LiveKit room for this call (from the job context).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>

NeuroLink's event emitter (`neurolink.getEventEmitter()`).

---

### options?

> `optional` **options?**: [`LiveKitEventBridgeConfig`](LiveKitEventBridgeConfig.md)

Bridge options (topics, filtering, chunking threshold).
