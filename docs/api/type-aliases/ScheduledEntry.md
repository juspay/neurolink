[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScheduledEntry

# Type Alias: ScheduledEntry

> **ScheduledEntry** = `object`

Defined in: [types/task.ts:313](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L313)

Internal scheduling entry used by NodeTimeoutBackend

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/task.ts:314](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L314)

---

### executor

> **executor**: [`TaskExecutorFn`](TaskExecutorFn.md)

Defined in: [types/task.ts:315](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L315)

---

### task

> **task**: [`Task`](Task.md)

Defined in: [types/task.ts:316](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L316)

---

### cronJob?

> `optional` **cronJob?**: `Cron`

Defined in: [types/task.ts:318](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L318)

---

### intervalId?

> `optional` **intervalId?**: `ReturnType`\<_typeof_ `setInterval`\>

Defined in: [types/task.ts:319](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L319)

---

### timeoutId?

> `optional` **timeoutId?**: `ReturnType`\<_typeof_ `setTimeout`\>

Defined in: [types/task.ts:320](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L320)
