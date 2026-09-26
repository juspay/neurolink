[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitNeuroLinkStreamer

# Type Alias: LiveKitNeuroLinkStreamer

> **LiveKitNeuroLinkStreamer** = `object`

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

#### Parameters

##### options

[`StreamOptions`](StreamOptions.md)

#### Returns

`Promise`\<[`StreamResult`](StreamResult.md)\>

---

### getEventEmitter?

> `optional` **getEventEmitter?**: () => `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>

#### Returns

`TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\>
