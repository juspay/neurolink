[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessResult

# Type Alias: ProcessResult

> **ProcessResult** = `object`

Defined in: [types/common.ts:263](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L263)

Result of executing a child process (shell command).

## Properties

### code

> **code**: `number` \| `null`

Defined in: [types/common.ts:265](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L265)

Exit code of the process

---

### stdout

> **stdout**: `string`

Defined in: [types/common.ts:267](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L267)

Standard output

---

### stderr

> **stderr**: `string`

Defined in: [types/common.ts:269](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L269)

Standard error output

---

### success

> **success**: `boolean`

Defined in: [types/common.ts:271](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L271)

Whether the process exited successfully (code === 0)
