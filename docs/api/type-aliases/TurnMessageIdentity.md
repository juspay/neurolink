[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TurnMessageIdentity

# Type Alias: TurnMessageIdentity

> **TurnMessageIdentity** = `object`

Id and metadata a memory manager gives one stored message of a turn.

## Properties

### id

> **id**: `string` \| `undefined`

Stable id for the message, or undefined to let the manager mint a random one.

---

### metadata

> **metadata**: [`ChatMessageMetadata`](ChatMessageMetadata.md) \| `undefined`

Metadata to set on the message, or undefined when there is none to add.
