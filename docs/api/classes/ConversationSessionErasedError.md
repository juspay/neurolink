[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationSessionErasedError

# Class: ConversationSessionErasedError

Raised when a write reaches a session that was permanently erased. The
erasure tombstone outlives the session's data, so a late writer cannot
resurrect it.

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationSessionErasedError**(): `ConversationSessionErasedError`

#### Returns

`ConversationSessionErasedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"SESSION_ERASED"` = `"SESSION_ERASED"`
