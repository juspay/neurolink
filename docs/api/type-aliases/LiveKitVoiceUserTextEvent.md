[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceUserTextEvent

# Type Alias: LiveKitVoiceUserTextEvent

> **LiveKitVoiceUserTextEvent** = `object`

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

---

### data

> **data**: `object`

#### text

> **text**: `string`

#### final

> **final**: `boolean`

#### replacesPrevious?

> `optional` **replacesPrevious?**: `boolean`
