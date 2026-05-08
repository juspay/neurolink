[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationData

# Type Alias: ConversationData

> **ConversationData** = [`RedisConversationObject`](RedisConversationObject.md) & `object`

Defined in: [types/conversation.ts:570](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L570)

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
