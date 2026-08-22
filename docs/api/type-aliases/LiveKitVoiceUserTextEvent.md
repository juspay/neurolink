[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceUserTextEvent

# Type Alias: LiveKitVoiceUserTextEvent

> **LiveKitVoiceUserTextEvent** = `object`

Defined in: [types/livekit.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L250)

A user STT transcript for display. Interim partials stream with
`final: false`; the end-of-utterance result has `final: true`. The client
updates one live bubble and commits it on `final`.

`replacesPrevious` is set on the committed (`final: true`) text of a turn that
absorbed a previous turn the user interrupted before it produced any reply
(strict barge-in club). The client removes the orphaned previous user bubble
so the merged utterance shows as one bubble.

## Properties

### type

> **type**: `"user-text"`

Defined in: [types/livekit.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L251)

---

### data

> **data**: `object`

Defined in: [types/livekit.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L252)

#### text

> **text**: `string`

#### final

> **final**: `boolean`

#### replacesPrevious?

> `optional` **replacesPrevious?**: `boolean`
