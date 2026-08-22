[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CronSchedule

# Type Alias: CronSchedule

> **CronSchedule** = `object`

Defined in: [types/task.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L54)

## Properties

### type

> **type**: `"cron"`

Defined in: [types/task.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L55)

---

### expression

> **expression**: `string`

Defined in: [types/task.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L57)

Standard 5-field cron expression, e.g. "0 9 \* \* \*"

---

### timezone?

> `optional` **timezone?**: `string`

Defined in: [types/task.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L59)

IANA timezone, e.g. "America/New_York"
