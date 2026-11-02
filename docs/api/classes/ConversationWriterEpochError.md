[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationWriterEpochError

# Class: ConversationWriterEpochError

Raised when a fenced write cannot prove it belongs to the store epoch it was
admitted under: the context is missing or not fenced, the Redis server
restarted, or its eviction counter moved.

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationWriterEpochError**(): `ConversationWriterEpochError`

#### Returns

`ConversationWriterEpochError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"SESSION_WRITER_EPOCH_LOST"` = `"SESSION_WRITER_EPOCH_LOST"`
