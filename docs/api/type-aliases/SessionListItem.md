[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionListItem

# Type Alias: SessionListItem

> **SessionListItem** = [`SessionMetadata`](SessionMetadata.md) & `object`

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
