[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskRetentionConfig

# Type Alias: TaskRetentionConfig

> **TaskRetentionConfig** = `object`

Defined in: [types/task.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L329)

## Properties

### completedTTL?

> `optional` **completedTTL?**: `number`

Defined in: [types/task.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L331)

Auto-delete completed tasks after N ms. Default: 30 days

---

### failedTTL?

> `optional` **failedTTL?**: `number`

Defined in: [types/task.ts:333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L333)

Auto-delete failed tasks after N ms. Default: 7 days

---

### cancelledTTL?

> `optional` **cancelledTTL?**: `number`

Defined in: [types/task.ts:335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L335)

Auto-delete cancelled tasks after N ms. Default: 7 days

---

### runLogTTL?

> `optional` **runLogTTL?**: `number`

Defined in: [types/task.ts:337](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L337)

Auto-expire individual run log entries after N ms. Default: 30 days
