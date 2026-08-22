[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryError

# Class: ConversationMemoryError

Defined in: [types/conversation.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L441)

Error types specific to conversation memory

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationMemoryError**(`message`, `code`, `details?`): `ConversationMemoryError`

Defined in: [types/conversation.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L442)

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

Defined in: [types/conversation.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L444)

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L449)
