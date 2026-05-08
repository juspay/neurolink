[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryError

# Class: ConversationMemoryError

Defined in: [types/conversation.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L385)

Error types specific to conversation memory

## Extends

- `Error`

## Constructors

### Constructor

> **new ConversationMemoryError**(`message`, `code`, `details?`): `ConversationMemoryError`

Defined in: [types/conversation.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L386)

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

Defined in: [types/conversation.ts:388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L388)

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L393)
