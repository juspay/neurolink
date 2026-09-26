[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScheduledEntry

# Type Alias: ScheduledEntry

> **ScheduledEntry** = `object`

Internal scheduling entry used by NodeTimeoutBackend

## Properties

### taskId

> **taskId**: `string`

---

### executor

> **executor**: [`TaskExecutorFn`](TaskExecutorFn.md)

---

### task

> **task**: [`Task`](Task.md)

---

### cronJob?

> `optional` **cronJob?**: `Cron`

---

### intervalId?

> `optional` **intervalId?**: `ReturnType`\<_typeof_ `setInterval`\>

---

### timeoutId?

> `optional` **timeoutId?**: `ReturnType`\<_typeof_ `setTimeout`\>
