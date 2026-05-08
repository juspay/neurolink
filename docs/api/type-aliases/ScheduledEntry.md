[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScheduledEntry

# Type Alias: ScheduledEntry

> **ScheduledEntry** = `object`

Defined in: [types/task.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L309)

Internal scheduling entry used by NodeTimeoutBackend

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/task.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L310)

---

### executor

> **executor**: [`TaskExecutorFn`](TaskExecutorFn.md)

Defined in: [types/task.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L311)

---

### task

> **task**: [`Task`](Task.md)

Defined in: [types/task.ts:312](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L312)

---

### cronJob?

> `optional` **cronJob?**: `Cron`

Defined in: [types/task.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L314)

---

### intervalId?

> `optional` **intervalId?**: `ReturnType`\<_typeof_ `setInterval`\>

Defined in: [types/task.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L315)

---

### timeoutId?

> `optional` **timeoutId?**: `ReturnType`\<_typeof_ `setTimeout`\>

Defined in: [types/task.ts:316](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L316)
