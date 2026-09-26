[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventBridgeHandle

# Type Alias: RealtimeEventBridgeHandle

> **RealtimeEventBridgeHandle** = `object`

Handle returned by `attachRealtimeEventBridge`.

## Properties

### publishEvent

> **publishEvent**: [`RealtimeEventPublisher`](RealtimeEventPublisher.md)

Publish an outbound event to the browser (data packet or text stream).

---

### requestConfirmation

> **requestConfirmation**: [`RealtimeConfirmationRequester`](RealtimeConfirmationRequester.md)

Open a HITL prompt and await the browser's decision (timeout = decline).

---

### dispose

> **dispose**: () => `void`

Remove the control-channel listener and clear pending confirmations.

#### Returns

`void`
