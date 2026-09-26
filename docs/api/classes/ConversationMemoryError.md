[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryError

# Class: ConversationMemoryError

Error types specific to conversation memory

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationMemoryError**(`message`, `code`, `details?`): `ConversationMemoryError`

#### Parameters

##### message

`string`

##### code

`"STORAGE_ERROR"` \| `"CONFIG_ERROR"` \| `"SESSION_NOT_FOUND"` \| `"CLEANUP_ERROR"`

##### details?

`Record`\<`string`, `unknown`\>

#### Returns

`ConversationMemoryError`

#### Overrides

`Error.constructor`

## Properties

### code

> **code**: `"STORAGE_ERROR"` \| `"CONFIG_ERROR"` \| `"SESSION_NOT_FOUND"` \| `"CLEANUP_ERROR"`

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>
