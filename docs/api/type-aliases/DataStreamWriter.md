[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriter

# Type Alias: DataStreamWriter

> **DataStreamWriter** = `object`

Data stream writer interface

## Methods

### writeTextStart()

> **writeTextStart**(`id`): `Promise`\<`void`\>

Write text start event

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### writeTextDelta()

> **writeTextDelta**(`id`, `delta`): `Promise`\<`void`\>

Write text delta event

#### Parameters

##### id

`string`

##### delta

`string`

#### Returns

`Promise`\<`void`\>

---

### writeTextEnd()

> **writeTextEnd**(`id`): `Promise`\<`void`\>

Write text end event

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### writeToolCall()

> **writeToolCall**(`toolCall`): `Promise`\<`void`\>

Write tool call event

#### Parameters

##### toolCall

###### id

`string`

###### name

`string`

###### arguments

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`void`\>

---

### writeToolResult()

> **writeToolResult**(`toolResult`): `Promise`\<`void`\>

Write tool result event

#### Parameters

##### toolResult

###### id

`string`

###### name

`string`

###### result

`unknown`

#### Returns

`Promise`\<`void`\>

---

### writeData()

> **writeData**(`data`): `Promise`\<`void`\>

Write arbitrary data event

#### Parameters

##### data

`unknown`

#### Returns

`Promise`\<`void`\>

---

### writeError()

> **writeError**(`error`): `Promise`\<`void`\>

Write error event

#### Parameters

##### error

###### message

`string`

###### code?

`string`

#### Returns

`Promise`\<`void`\>

---

### close()

> **close**(): `Promise`\<`void`\>

Close the stream

#### Returns

`Promise`\<`void`\>
