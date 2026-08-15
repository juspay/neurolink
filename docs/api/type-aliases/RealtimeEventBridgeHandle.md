[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventBridgeHandle

# Type Alias: RealtimeEventBridgeHandle

> **RealtimeEventBridgeHandle** = `object`

Defined in: [types/livekit.ts:521](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L521)

Handle returned by `attachRealtimeEventBridge`.

## Properties

### publishEvent

> **publishEvent**: [`RealtimeEventPublisher`](RealtimeEventPublisher.md)

Defined in: [types/livekit.ts:523](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L523)

Publish an outbound event to the browser (data packet or text stream).

---

### requestConfirmation

> **requestConfirmation**: [`RealtimeConfirmationRequester`](RealtimeConfirmationRequester.md)

Defined in: [types/livekit.ts:525](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L525)

Open a HITL prompt and await the browser's decision (timeout = decline).

---

### dispose

> **dispose**: () => `void`

Defined in: [types/livekit.ts:527](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L527)

Remove the control-channel listener and clear pending confirmations.

#### Returns

`void`
