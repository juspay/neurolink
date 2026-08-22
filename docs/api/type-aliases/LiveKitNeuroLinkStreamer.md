[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitNeuroLinkStreamer

# Type Alias: LiveKitNeuroLinkStreamer

> **LiveKitNeuroLinkStreamer** = `object`

Defined in: [types/livekit.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L27)

Minimal structural shape of the NeuroLink instance the brain depends on.

Declared structurally (rather than importing the `NeuroLink` class) so the
brain layer stays decoupled from SDK construction and can be unit-tested with
a lightweight stub. The real `NeuroLink` instance satisfies this shape.

`getEventEmitter` is optional so lightweight stubs remain valid; the real
`NeuroLink` instance provides it, and the data-channel event bridge uses it
to forward tool/text/HITL events to the browser.

## Properties

### stream

> **stream**: (`options`) => `Promise`\<[`StreamResult`](StreamResult.md)\>

Defined in: [types/livekit.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L28)

#### Parameters

##### options

[`StreamOptions`](StreamOptions.md)

#### Returns

`Promise`\<[`StreamResult`](StreamResult.md)\>

---

### getEventEmitter?

> `optional` **getEventEmitter?**: () => `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>

Defined in: [types/livekit.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L29)

#### Returns

`TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>
