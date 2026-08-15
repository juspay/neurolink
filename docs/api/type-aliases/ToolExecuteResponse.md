[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecuteResponse

# Type Alias: ToolExecuteResponse

> **ToolExecuteResponse** = `object`

Defined in: [types/server.ts:713](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L713)

Tool execution response

## Properties

### success

> **success**: `boolean`

Defined in: [types/server.ts:715](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L715)

Whether execution was successful

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/server.ts:718](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L718)

Result data

---

### error?

> `optional` **error?**: `string`

Defined in: [types/server.ts:721](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L721)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/server.ts:724](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L724)

Execution duration in ms

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/server.ts:727](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L727)

Tool metadata
