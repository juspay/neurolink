[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskRetentionConfig

# Type Alias: TaskRetentionConfig

> **TaskRetentionConfig** = `object`

## Properties

### completedTTL?

> `optional` **completedTTL?**: `number`

Auto-delete completed tasks after N ms. Default: 30 days

---

### failedTTL?

> `optional` **failedTTL?**: `number`

Auto-delete failed tasks after N ms. Default: 7 days

---

### cancelledTTL?

> `optional` **cancelledTTL?**: `number`

Auto-delete cancelled tasks after N ms. Default: 7 days

---

### runLogTTL?

> `optional` **runLogTTL?**: `number`

Auto-expire individual run log entries after N ms. Default: 30 days
