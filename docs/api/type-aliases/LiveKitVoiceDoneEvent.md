[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceDoneEvent

# Type Alias: LiveKitVoiceDoneEvent

> **LiveKitVoiceDoneEvent** = `object`

The current turn has finished. `turnId` is set when the call's turns are
being recorded: it is the id the stored messages carry (`${turnId}:user`,
`${turnId}:assistant`), so a client can merge its live copy with history.

## Properties

### type

> **type**: `"done"`

---

### data

> **data**: `object`

#### reason?

> `optional` **reason?**: `string`

#### turnId?

> `optional` **turnId?**: `string`
