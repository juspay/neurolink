[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionListItem

# Type Alias: SessionListItem

> **SessionListItem** = [`SessionMetadata`](SessionMetadata.md) & `object`

Defined in: [types/conversation.ts:576](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L576)

Session list item for CLI/API listing
Extends SessionMetadata with additional display information

## Type Declaration

### userId?

> `optional` **userId?**: `string`

User identifier associated with this session

### messageCount

> **messageCount**: `number`

Total number of messages in this session

### lastActive?

> `optional` **lastActive?**: `string`

Human-readable time since last activity (e.g., "2 hours ago")
