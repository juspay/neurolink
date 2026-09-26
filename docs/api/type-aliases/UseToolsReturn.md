[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseToolsReturn

# Type Alias: UseToolsReturn

> **UseToolsReturn** = `object`

useTools hook return type

## Properties

### tools

> **tools**: [`ClientToolInfo`](ClientToolInfo.md)[]

Available tools

---

### execute

> **execute**: (`toolName`, `params`) => `Promise`\<`unknown`\>

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

Refresh tool list

#### Returns

`Promise`\<`void`\>

---

### isLoading

> **isLoading**: `boolean`

Loading state

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Error state
