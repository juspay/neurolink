[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryError

# Class: ConversationMemoryError

Defined in: [types/conversation.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L449)

Error types specific to conversation memory

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationMemoryError**(`message`, `code`, `details?`): `ConversationMemoryError`

Defined in: [types/conversation.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L450)

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

Defined in: [types/conversation.ts:452](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L452)

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L457)
