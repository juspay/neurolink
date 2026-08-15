[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseToolsReturn

# Type Alias: UseToolsReturn

> **UseToolsReturn** = `object`

Defined in: [types/client.ts:816](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L816)

useTools hook return type

## Properties

### tools

> **tools**: [`ClientToolInfo`](ClientToolInfo.md)[]

Defined in: [types/client.ts:818](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L818)

Available tools

---

### execute

> **execute**: (`toolName`, `params`) => `Promise`\<`unknown`\>

Defined in: [types/client.ts:820](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L820)

Execute a tool

#### Parameters

##### toolName

`string`

##### params

[`UnknownRecord`](UnknownRecord.md)

#### Returns

`Promise`\<`unknown`\>

---

### refresh

> **refresh**: () => `Promise`\<`void`\>

Defined in: [types/client.ts:822](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L822)

Refresh tool list

#### Returns

`Promise`\<`void`\>

---

### isLoading

> **isLoading**: `boolean`

Defined in: [types/client.ts:824](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L824)

Loading state

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:826](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L826)

Error state
