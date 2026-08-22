[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskRetentionConfig

# Type Alias: TaskRetentionConfig

> **TaskRetentionConfig** = `object`

Defined in: [types/task.ts:333](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L333)

## Properties

### completedTTL?

> `optional` **completedTTL?**: `number`

Defined in: [types/task.ts:335](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L335)

Auto-delete completed tasks after N ms. Default: 30 days

---

### failedTTL?

> `optional` **failedTTL?**: `number`

Defined in: [types/task.ts:337](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L337)

Auto-delete failed tasks after N ms. Default: 7 days

---

### cancelledTTL?

> `optional` **cancelledTTL?**: `number`

Defined in: [types/task.ts:339](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L339)

Auto-delete cancelled tasks after N ms. Default: 7 days

---

### runLogTTL?

> `optional` **runLogTTL?**: `number`

Defined in: [types/task.ts:341](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L341)

Auto-expire individual run log entries after N ms. Default: 30 days
