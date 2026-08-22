[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationData

# Type Alias: ConversationData

> **ConversationData** = [`RedisConversationObject`](RedisConversationObject.md) & `object`

Defined in: [types/conversation.ts:679](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L679)

Full conversation data for session restoration and manipulation
Extends Redis storage object with additional loop mode metadata

## Type Declaration

### metadata?

> `optional` **metadata?**: `object`

Optional metadata for session variables and other loop mode data

#### Index Signature

\[`key`: `string`\]: `unknown`

Additional metadata can be added here

#### metadata.sessionVariables?

> `optional` **sessionVariables?**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Session variables set during loop mode

#### metadata.messageCount?

> `optional` **messageCount?**: `number`

Message count (for compatibility)
